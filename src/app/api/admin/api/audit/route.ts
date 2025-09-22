import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ApiAuditLog from '@/models/apiAudit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper function to validate companyId and locationId against session
function validateCompanyAndLocation(session: any, companyId: string, locationId: string) {
  const company = session?.user?.companies.find((c: any) => c.companyId === companyId);
  if (!company) {
    return false;
  }
  return company.locations.some((l: any) => l.locationId === locationId);
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.companies?.length) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized or no company assigned' },
        { status: 401 }
      );
    }

    const { action, data, previousData, companyId, locationId, timestamp } = await request.json();
    // Remove userId from destructuring since we'll get it from session
    
    if (!action || !data || !companyId || !locationId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify companyId and locationId are in the user's session
    if (!validateCompanyAndLocation(session, companyId, locationId)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized company or location access' },
        { status: 403 }
      );
    }

    const auditLog = new ApiAuditLog({
      userId: session.user.id, // Use session.user.id instead of userId from request body
      action,
      data,
      previousData,
      companyId,
      locationId,
      timestamp: timestamp || new Date(),
    });
    await auditLog.save();

    return NextResponse.json(
      { success: true, data: auditLog },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}


export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.companies?.length) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized or no company assigned' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const locationId = searchParams.get('locationId');
    const api = searchParams.get('api');
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const searchTerm = searchParams.get('searchTerm');

    if (!companyId || !locationId) {
      return NextResponse.json(
        { success: false, error: 'Company ID and Location ID are required' },
        { status: 400 }
      );
    }

    // Verify companyId and locationId are in the user's session
    if (!validateCompanyAndLocation(session, companyId, locationId)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized company or location access' },
        { status: 403 }
      );
    }

    // Build query
    const query: any = { companyId, locationId };

    // Filter by api (exact match in data.api or previousData.api)
    if (api) {
      query.$or = [
        { 'data.api': api },
        { 'previousData.api': api }
      ];
    }

    // Filter by action
    if (action) {
      query.action = action;
    }

    // Filter by time range
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }

    // Search by keyword in api or desc
    if (searchTerm) {
      query.$or = query.$or || [];
      query.$or.push(
        { 'data.api': { $regex: searchTerm, $options: 'i' } },
        { 'data.desc': { $regex: searchTerm, $options: 'i' } },
        { 'previousData.api': { $regex: searchTerm, $options: 'i' } },
        { 'previousData.desc': { $regex: searchTerm, $options: 'i' } }
      );
    }

    console.log('Audit query:', JSON.stringify(query, null, 2));

    const auditLogs = await ApiAuditLog.find(query).sort({ timestamp: -1 });
    
    console.log('Found audit logs:', auditLogs.length);

    // Get unique user IDs from audit logs
    const userIds = [...new Set(auditLogs.map(log => log.userId?.toString()).filter(Boolean))];
    
    console.log('User IDs to lookup:', userIds);

    // Create user lookup map with proper import
    let userMap: { [key: string]: string } = {};
    
    if (userIds.length > 0) {
      try {
        // Try different import patterns based on your User model export
        let User;
        
        try {
          // Try default import first
          User = (await import('@/models/user')).default;
        } catch {
          // If that fails, try named export
          const userModule = await import('@/models/user');
          User = userModule.User;
        }
        
        if (!User) {
          console.error('Could not import User model');
        } else {
          const users = await User.find({ _id: { $in: userIds } }).select('_id userId');
          console.log('Found users:', users);
          
          userMap = users.reduce((acc: { [key: string]: string }, user: any) => {
            acc[user._id.toString()] = user.userId;
            return acc;
          }, {});
        }
      } catch (userError: any) {
        console.error('Error fetching users:', userError);
        // Continue without user mapping if there's an error
      }
    }

    // Transform logs with usernames (fallback to current session user for matching IDs)
    const transformedLogs = auditLogs.map(log => {
      let username = userMap[log.userId?.toString()] || log.userId || 'Unknown User';
      
      // If we couldn't get the username from database, check if it's the current user
      if (!userMap[log.userId?.toString()] && log.userId?.toString() === session.user.id) {
        username = session.user.userId || 'Current User';
      }
      
      return {
        ...log.toObject(),
        username
      };
    });
    
    console.log('Transformed logs sample:', transformedLogs.slice(0, 1));
    
    return NextResponse.json({ success: true, data: transformedLogs }, { status: 200 });
  } catch (error: any) {
    console.error('Audit logs error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}
