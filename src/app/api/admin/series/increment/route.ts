import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { Series } from '@/models/Series';
import { SeriesAudit } from '@/models/series-audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PUT(req: NextRequest) {
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

    const oldCurrentNumber = series.currentNumber;
    series.currentNumber += 1;
    const updatedSeries = await series.save();

    // Create audit log
    const audit = new SeriesAudit({
      action: 'update',
      userId: session.user.userId,
      module: 'series',
      companyId,
      locationId,
      seriesId: updatedSeries._id,
      fieldName: 'currentNumber',
      oldValue: oldCurrentNumber,
      newValue: updatedSeries.currentNumber,
      changes: [{ field: 'currentNumber', from: oldCurrentNumber, to: updatedSeries.currentNumber }],
      timestamp: new Date(),
    });
    await audit.save();

    return NextResponse.json({ success: true, data: updatedSeries });
  } catch (error: any) {
    console.error('PUT /api/admin/series/increment error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}