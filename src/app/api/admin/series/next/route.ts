import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { Series } from '@/models/Series';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const seriesId = req.nextUrl.searchParams.get('seriesId');
    const companyId = req.nextUrl.searchParams.get('companyId');
    const locationId = req.nextUrl.searchParams.get('locationId');

    if (!seriesId || !companyId || !locationId) {
      return NextResponse.json({ success: false, error: 'Series ID, Company ID, and Location ID are required' }, { status: 400 });
    }

    await mongoose.connect(process.env.MONGODB_URI!);
    const series = await Series.findOne({ _id: seriesId, companyId, locationId });

    if (!series) {
      return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 });
    }

    const columnId = `${series.prefix}${series.currentNumber.toString().padStart(series.padding, "0")}${series.suffix}`;
    return NextResponse.json({ success: true, data: { columnId } });
  } catch (error: any) {
    console.error('GET /api/admin/series/next error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}