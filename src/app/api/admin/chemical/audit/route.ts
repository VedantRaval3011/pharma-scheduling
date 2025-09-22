import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ChemicalAuditLog from '@/models/chemical/chemicalAudit';
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

    // CHANGE: Remove userId from destructuring and use session.user.id instead
    const { action, data, previousData, companyId, locationId, timestamp } = await request.json();
    
    // CHANGE: Remove userId validation since we get it from session
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

    const auditLog = new ChemicalAuditLog({
      userId: session.user.id, // CHANGE: Use session.user.id instead of userId from request
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
    const chemicalName = searchParams.get('chemicalName');
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

    // Filter by chemicalName (exact match in data.chemicalName or previousData.chemicalName)
    if (chemicalName) {
      query.$or = [
        { 'data.chemicalName': chemicalName },
        { 'previousData.chemicalName': chemicalName }
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

    // Search by keyword in chemicalName or desc
    if (searchTerm) {
      query.$or = query.$or || [];
      query.$or.push(
        { 'data.chemicalName': { $regex: searchTerm, $options: 'i' } },
        { 'data.desc': { $regex: searchTerm, $options: 'i' } },
        { 'previousData.chemicalName': { $regex: searchTerm, $options: 'i' } },
        { 'previousData.desc': { $regex: searchTerm, $options: 'i' } }
      );
    }

    const auditLogs = await ChemicalAuditLog.find(query).sort({ timestamp: -1 });
    
    // CHANGE: Transform logs to show username instead of userId
    const transformedLogs = auditLogs.map(log => ({
      ...log.toObject(),
      username: log.userId?.toString() === session.user.id ? session.user.userId : log.userId
    }));
    
    return NextResponse.json({ success: true, data: transformedLogs }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}