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

    const { userId, action, data, previousData, companyId, locationId, timestamp } = await request.json();
    if (!userId || !action || !data || !companyId || !locationId) {
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
      userId,
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

    const auditLogs = await ApiAuditLog.find(query).sort({ timestamp: -1 });
    
    return NextResponse.json({ success: true, data: auditLogs }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}