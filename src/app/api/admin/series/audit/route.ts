import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { SeriesAudit } from '@/models/series-audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface ChangeLog {
  field: string;
  from: any;
  to: any;
}

export async function POST(req: NextRequest) {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);

    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.companies || session.user.companies.length === 0) {
      return NextResponse.json({ success: false, error: 'No companies associated with user' }, { status: 400 });
    }

    const { userId, action, seriesId, companyId, locationId, changes } = await req.json();

    // Validate required fields
    if (!userId || !action || !companyId || !locationId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: userId, action, companyId, and locationId are required',
      }, { status: 400 });
    }

    // Verify access to company and location
    const company = session.user.companies.find((c: any) => c.companyId === companyId);
    if (!company) {
      return NextResponse.json({
        success: false,
        error: 'Company not found or access denied',
      }, { status: 403 });
    }

    const location = company.locations.find((l: any) => l.locationId === locationId);
    if (!location) {
      return NextResponse.json({
        success: false,
        error: 'Location not found or access denied',
      }, { status: 403 });
    }

    // Validate changes array
    if (changes && !Array.isArray(changes)) {
      return NextResponse.json({
        success: false,
        error: 'Changes must be an array',
      }, { status: 400 });
    }

    const audit = new SeriesAudit({
      action,
      userId,
      module: 'series',
      companyId,
      locationId,
      seriesId: seriesId || null,
      fieldName: changes?.length ? changes[0].field : 'series',
      oldValue: changes?.length ? changes[0].from : null,
      newValue: changes?.length ? changes[0].to : null,
      changes: changes || [],
      timestamp: new Date(),
    });

    console.log('Audit before save:', JSON.stringify(audit, null, 2));
    await audit.save();
    console.log('Audit log created successfully');

    return NextResponse.json({
      success: true,
      message: 'Audit logged',
      data: audit,
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/admin/series/audit error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to log audit',
      details: error.message,
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);

    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized', data: [] }, { status: 401 });
    }

    if (!session.user.companies || session.user.companies.length === 0) {
      return NextResponse.json({ success: false, error: 'No companies associated with user', data: [] }, { status: 400 });
    }

    const companyId = req.nextUrl.searchParams.get('companyId');
    const locationId = req.nextUrl.searchParams.get('locationId');

    if (!companyId || !locationId) {
      return NextResponse.json({
        success: false,
        error: 'Company ID and Location ID are required',
        data: [],
      }, { status: 400 });
    }

    // Verify access to company and location
    const company = session.user.companies.find((c: any) => c.companyId === companyId);
    if (!company) {
      return NextResponse.json({
        success: false,
        error: 'Company not found or access denied',
        data: [],
      }, { status: 403 });
    }

    const location = company.locations.find((l: any) => l.locationId === locationId);
    if (!location) {
      return NextResponse.json({
        success: false,
        error: 'Location not found or access denied',
        data: [],
      }, { status: 403 });
    }

    const auditLogs = await SeriesAudit.find({ companyId, locationId })
      .sort({ timestamp: -1 })
      .limit(1000);

    return NextResponse.json({
      success: true,
      data: auditLogs,
    });
  } catch (error: any) {
    console.error('GET /api/admin/series/audit error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch audit logs',
      data: [],
      details: error.message,
    }, { status: 500 });
  }
}