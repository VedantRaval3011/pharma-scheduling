// app/api/admin/mfc/audit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import MFCAudit from '@/models/mfcAudit';
import { z } from 'zod';

// Validation schema for creating audit records
const auditSchema = z.object({
  mfcId: z.string().min(1),
  mfcNumber: z.string().min(1),
  companyId: z.string().uuid(),
  locationId: z.string().uuid(),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE']),
  performedBy: z.string().min(1),
  changes: z.array(z.object({
    field: z.string().min(1),
    oldValue: z.any().optional(),
    newValue: z.any().optional(),
  })).optional(),
  oldData: z.record(z.string(), z.any()).optional(),
  newData: z.record(z.string(), z.any()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  reason: z.string().optional(),
});

// GET - Retrieve audit records with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const locationId = searchParams.get('locationId');
    const mfcId = searchParams.get('mfcId');
    const mfcNumber = searchParams.get('mfcNumber');
    const performedBy = searchParams.get('performedBy');
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!companyId || !locationId) {
      return NextResponse.json(
        { error: 'Company ID and Location ID are required' },
        { status: 400 }
      );
    }

    // Build query with data isolation
    const query: any = { companyId, locationId };
    
    // Add optional filters
    if (mfcId) query.mfcId = mfcId;
    if (mfcNumber) query.mfcNumber = { $regex: mfcNumber, $options: 'i' };
    if (performedBy) query.performedBy = { $regex: performedBy, $options: 'i' };
    if (action) query.action = action;

    // Date range filter
    if (startDate || endDate) {
      query.performedAt = {};
      if (startDate) query.performedAt.$gte = new Date(startDate);
      if (endDate) query.performedAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    
    const [records, total] = await Promise.all([
      MFCAudit.find(query)
        .sort({ performedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MFCAudit.countDocuments(query)
    ]);

    return NextResponse.json({
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error: any) {
    console.error('Error fetching audit records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit records' },
      { status: 500 }
    );
  }
}

// POST - Create new audit record
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    
    // Validate request body
    const validatedData = auditSchema.parse(body);

    // Add client information if not provided
    if (!validatedData.ipAddress) {
      validatedData.ipAddress = request.headers.get('x-forwarded-for') || 
        request.headers.get('x-real-ip') || 
        'unknown';
    }

    if (!validatedData.userAgent) {
      validatedData.userAgent = request.headers.get('user-agent') || 'unknown';
    }

    const newAudit = new MFCAudit(validatedData);
    const savedAudit = await newAudit.save();

    return NextResponse.json({
      message: 'Audit record created successfully',
      data: savedAudit,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating audit record:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create audit record' },
      { status: 500 }
    );
  }
}
