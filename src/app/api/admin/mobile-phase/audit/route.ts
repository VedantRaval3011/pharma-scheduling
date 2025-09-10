import { NextRequest, NextResponse } from 'next/server';
import MobilePhaseAuditLog from '@/models/mobile-phase/audit'; // Adjust import path as needed
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'; // Adjust if needed

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const locationId = searchParams.get('locationId');
    const mobilePhaseId = searchParams.get('mobilePhaseId'); // Optional: filter by specific mobilePhaseId
    const searchTerm = searchParams.get('searchTerm'); // Optional: search in data.mobilePhaseCode or description
    const action = searchParams.get('action'); // Optional: CREATE, UPDATE, DELETE
    const startDate = searchParams.get('startDate'); // Optional: ISO date string
    const endDate = searchParams.get('endDate'); // Optional: ISO date string

    if (!companyId || !locationId) {
      return NextResponse.json({ success: false, error: 'Company ID and Location ID are required' }, { status: 400 });
    }

    let query: any = { companyId, locationId };

    if (mobilePhaseId) {
      query.mobilePhaseId = mobilePhaseId;
    }

    if (action) {
      query.action = action.toUpperCase();
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    if (searchTerm) {
      query.$or = [
        { 'data.mobilePhaseCode': { $regex: searchTerm, $options: 'i' } },
        { 'data.description': { $regex: searchTerm, $options: 'i' } },
      ];
    }

    const auditLogs = await MobilePhaseAuditLog.find(query).sort({ timestamp: -1 });

    return NextResponse.json({ success: true, data: auditLogs });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { userId, action, mobilePhaseId, data, previousData, companyId, locationId, timestamp } = body;

    if (!userId || !action || !mobilePhaseId || !companyId || !locationId) {
      return NextResponse.json({ success: false, error: 'Required fields are missing' }, { status: 400 });
    }

    const newAuditLog = new MobilePhaseAuditLog({
      userId,
      action: action.toUpperCase(),
      mobilePhaseId,
      data,
      previousData,
      companyId,
      locationId,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    });

    await newAuditLog.save();

    return NextResponse.json({ success: true, data: newAuditLog }, { status: 201 });
  } catch (error: any) {
    console.error('Error logging audit action:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}