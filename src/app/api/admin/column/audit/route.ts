import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Audit from '@/models/columnAudit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = req.nextUrl.searchParams.get('companyId');
    const locationId = req.nextUrl.searchParams.get('locationId');

    if (!companyId || !locationId) {
      return NextResponse.json({ success: false, error: 'Company ID and Location ID are required' }, { status: 400 });
    }

    await mongoose.connect(process.env.MONGODB_URI!);
    const audits = await Audit.find({ companyId, locationId })
      .sort({ timestamp: -1 })
      .lean();

    return NextResponse.json({ success: true, data: audits });
  } catch (error: any) {
    console.error('GET /api/admin/column/audit error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = req.nextUrl.searchParams.get('companyId');
    const locationId = req.nextUrl.searchParams.get('locationId');

    if (!companyId || !locationId) {
      return NextResponse.json({ success: false, error: 'Company ID and Location ID are required' }, { status: 400 });
    }

    const body = await req.json();
    const { action, userId, module = 'Column Master', columnCode, changes } = body;

    if (!action || !userId) {
      return NextResponse.json({ success: false, error: 'Action and userId are required' }, { status: 400 });
    }

    // Add connection state check
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const auditEntry = new Audit({
      action,
      userId,
      module,
      companyId,
      locationId,
      columnCode,
      changes: changes || [],
      timestamp: new Date(),
    });

    await auditEntry.save();

    return NextResponse.json({ success: true, data: auditEntry }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/admin/column/audit error:', error);
    console.error('Error stack:', error.stack); // Add stack trace for better debugging
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}