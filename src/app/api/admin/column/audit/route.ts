import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Audit from '@/models/columnAudit';
import { getServerSession } from 'next-auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const companyIdParam = req.nextUrl.searchParams.get('companyId');
    const locationIdParam = req.nextUrl.searchParams.get('locationId');
    const { companyId, locationId } = companyIdParam && locationIdParam
      ? { companyId: companyIdParam, locationId: locationIdParam }
      : { companyId: session.user.companies[0].companyId, locationId: session.user.companies[0].locations[0].locationId };

    if (!companyId || !locationId) {
      return NextResponse.json({ success: false, error: 'Company ID and Location ID are required' }, { status: 400 });
    }

    await mongoose.connect(process.env.MONGODB_URI!);
    const audits = await Audit.find({ module: 'column', companyId, locationId }).sort({ timestamp: -1 });

    return NextResponse.json({ success: true, data: audits });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}