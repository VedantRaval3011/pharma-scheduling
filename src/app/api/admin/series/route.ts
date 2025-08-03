import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { Series } from '@/models/Series';
import { SeriesAudit } from '@/models/series-audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; 

interface ChangeLog {
  field: string;
  from: any;
  to: any;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.companies || session.user.companies.length === 0) {
      return NextResponse.json({ success: false, error: 'No companies associated with user' }, { status: 400 });
    }

    const companyParam = req.nextUrl.searchParams.get('companyId');
    const locationParam = req.nextUrl.searchParams.get('locationId');
    const { companyId, locationId } = companyParam && locationParam
      ? { companyId: companyParam, locationId: locationParam }
      : { companyId: session.user.companies[0].companyId, locationId: session.user.companies[0].locations[0].locationId };

    if (!companyId || !locationId) {
      return NextResponse.json({ success: false, error: 'Company ID and Location ID are required' }, { status: 400 });
    }

    await mongoose.connect(process.env.MONGODB_URI!);
    const series = await Series.find({ companyId, locationId }).sort({ name: 1 });

    return NextResponse.json({ success: true, data: series });
  } catch (error: any) {
    console.error('GET /api/admin/series error:', error);
    return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.companies || session.user.companies.length === 0) {
      return NextResponse.json({ success: false, error: 'No companies associated with user' }, { status: 400 });
    }

    const { companyId, locationId } = session.user.companies[0].companyId && session.user.companies[0].locations[0].locationId
      ? { companyId: session.user.companies[0].companyId, locationId: session.user.companies[0].locations[0].locationId }
      : { companyId: null, locationId: null };

    if (!companyId || !locationId) {
      return NextResponse.json({ success: false, error: 'Company ID and Location ID are required' }, { status: 400 });
    }

    const body = await req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));

    // Validate required fields
    if (!body.name || !body.prefix) { // Removed suffix from required fields
      return NextResponse.json({
        success: false,
        error: 'Name and prefix are required',
      }, { status: 400 });
    }

    await mongoose.connect(process.env.MONGODB_URI!);
    const existingSeries = await Series.findOne({ name: body.name, companyId, locationId });
    if (existingSeries) {
      return NextResponse.json({
        success: false,
        error: 'Series with this name already exists',
      }, { status: 409 });
    }

    const formattedBody = {
      name: body.name.trim(),
      prefix: body.prefix.trim(),
      suffix: body.suffix?.trim() || '', // Suffix is optional
      currentNumber: body.currentNumber || 1,
      padding: body.padding || 4,
      isActive: body.isActive !== undefined ? body.isActive : true,
      resetFrequency: body.resetFrequency || 'none',
      companyId,
      locationId,
      createdBy: session.user.userId,
    };

    console.log('Formatted body:', JSON.stringify(formattedBody, null, 2));

    const series = new Series(formattedBody);
    console.log('Series before save:', JSON.stringify(series, null, 2));

    const savedSeries = await series.save();
    console.log('Series saved successfully:', JSON.stringify(savedSeries, null, 2));

    // Create audit log with field-level details
    const changes: ChangeLog[] = [
      { field: 'name', from: undefined, to: formattedBody.name },
      { field: 'prefix', from: undefined, to: formattedBody.prefix },
      { field: 'suffix', from: undefined, to: formattedBody.suffix },
      { field: 'currentNumber', from: undefined, to: formattedBody.currentNumber },
      { field: 'padding', from: undefined, to: formattedBody.padding },
      { field: 'isActive', from: undefined, to: formattedBody.isActive },
      { field: 'resetFrequency', from: undefined, to: formattedBody.resetFrequency },
    ].filter(change => change.to !== undefined && change.to !== '');

    const audit = new SeriesAudit({
      action: 'create',
      userId: session.user.userId,
      module: 'series',
      companyId,
      locationId,
      seriesId: savedSeries._id,
      fieldName: 'series',
      oldValue: null,
      newValue: formattedBody.name,
      changes,
      timestamp: new Date(),
    });
    await audit.save();
    console.log('Audit log created successfully');

    return NextResponse.json({ success: true, data: savedSeries }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/admin/series error:', error);

    if (error.code === 11000) {
      return NextResponse.json({
        success: false,
        error: 'Series with this name already exists',
      }, { status: 409 });
    }

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({
        success: false,
        error: `Validation error: ${validationErrors.join(', ')}`,
      }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.companies || session.user.companies.length === 0) {
      return NextResponse.json({ success: false, error: 'No companies associated with user' }, { status: 400 });
    }

    const companyParam = req.nextUrl.searchParams.get('companyId');
    const locationParam = req.nextUrl.searchParams.get('locationId');
    const { companyId, locationId } = companyParam && locationParam
      ? { companyId: companyParam, locationId: locationParam }
      : { companyId: session.user.companies[0].companyId, locationId: session.user.companies[0].locations[0].locationId };

    const { id, ...body } = await req.json();

    if (!companyId || !locationId || !id) {
      return NextResponse.json({ success: false, error: 'Company ID, Location ID, and Series ID are required' }, { status: 400 });
    }

    const formattedBody = {
      name: body.name?.trim(),
      prefix: body.prefix?.trim(),
      suffix: body.suffix?.trim() || '', // Suffix is optional
      currentNumber: body.currentNumber || 1,
      padding: body.padding || 4,
      isActive: body.isActive !== undefined ? body.isActive : true,
      resetFrequency: body.resetFrequency || 'none',
      companyId,
      locationId,
      updatedAt: new Date(),
    };

    await mongoose.connect(process.env.MONGODB_URI!);
    const oldSeries = await Series.findOne({ _id: id, companyId, locationId });
    if (!oldSeries) {
      return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 });
    }

    // Check for name conflicts
    if (formattedBody.name && formattedBody.name !== oldSeries.name) {
      const existingSeries = await Series.findOne({
        name: formattedBody.name,
        companyId,
        locationId,
        _id: { $ne: id },
      });
      if (existingSeries) {
        return NextResponse.json({
          success: false,
          error: 'Series with this name already exists',
        }, { status: 409 });
      }
    }

    const updatedSeries = await Series.findOneAndUpdate(
      { _id: id, companyId, locationId },
      { $set: formattedBody },
      { new: true, runValidators: true }
    );

    if (!updatedSeries) {
      return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 });
    }

    // Generate field-level changes
    const changes: ChangeLog[] = [];
    const fields = ['name', 'prefix', 'suffix', 'currentNumber', 'padding', 'isActive', 'resetFrequency'];
    fields.forEach(field => {
      if (oldSeries[field] !== updatedSeries[field]) {
        changes.push({
          field,
          from: oldSeries[field],
          to: updatedSeries[field],
        });
      }
    });

    // Create audit log
    const audit = new SeriesAudit({
      action: 'update',
      userId: session.user.userId,
      module: 'series',
      companyId,
      locationId,
      seriesId: updatedSeries._id,
      fieldName: 'series',
      oldValue: oldSeries.name,
      newValue: updatedSeries.name,
      changes: changes.length > 0 ? changes : [{ field: 'No changes detected', from: null, to: null }],
      timestamp: new Date(),
    });
    await audit.save();

    return NextResponse.json({ success: true, data: updatedSeries });
  } catch (error: any) {
    console.error('PUT /api/admin/series error:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({
        success: false,
        error: `Validation error: ${validationErrors.join(', ')}`,
      }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.companies || session.user.companies.length === 0) {
      return NextResponse.json({ success: false, error: 'No companies associated with user' }, { status: 400 });
    }

    const companyParam = req.nextUrl.searchParams.get('companyId');
    const locationParam = req.nextUrl.searchParams.get('locationId');
    const { companyId, locationId } = companyParam && locationParam
      ? { companyId: companyParam, locationId: locationParam }
      : { companyId: session.user.companies[0].companyId, locationId: session.user.companies[0].locations[0].locationId };

    const { id } = await req.json();

    if (!companyId || !locationId || !id) {
      return NextResponse.json({ success: false, error: 'Company ID, Location ID, and Series ID are required' }, { status: 400 });
    }

    await mongoose.connect(process.env.MONGODB_URI!);
    const series = await Series.findOneAndDelete({ _id: id, companyId, locationId });
    if (!series) {
      return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 });
    }

    // Create audit log
    const audit = new SeriesAudit({
      action: 'delete',
      userId: session.user.userId,
      module: 'series',
      companyId,
      locationId,
      seriesId: series._id,
      fieldName: 'series',
      oldValue: series.name,
      newValue: 'deleted',
      changes: [{ field: 'series', from: series.name, to: 'deleted' }],
      timestamp: new Date(),
    });
    await audit.save();

    return NextResponse.json({ success: true, message: 'Series deleted' });
  } catch (error: any) {
    console.error('DELETE /api/admin/series error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}