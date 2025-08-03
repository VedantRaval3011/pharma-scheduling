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