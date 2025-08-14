// app/api/admin/mfc/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import MFCMaster from '@/models/MFCMaster';
import { z } from 'zod';

// Validation schema
const mfcSchema = z.object({
  mfcNumber: z.number().min(1),
  companyId: z.string().uuid(),
  locationId: z.string().uuid(),
  genericName: z.string().min(1),
  apiId: z.string().min(1),
  departmentId: z.string().min(1),
  testTypeId: z.string().min(1),
  detectorTypeId: z.string().min(1),
  pharmacopoeialId: z.string().min(1),
  columnCode: z.string().min(1),
  mobilePhaseCode1: z.string().min(1),
  mobilePhaseCode2: z.string().optional(),
  mobilePhaseCode3: z.string().optional(),
  mobilePhaseCode4: z.string().optional(),
  sampleInjection: z.number().min(0),
  blankInjection: z.number().min(0),
  bracketingFrequency: z.number().min(0),
  injectionTime: z.number().min(0),
  runTime: z.number().min(0),
  testApplicability: z.boolean().optional(),
  bulk: z.boolean().optional(),
  fp: z.boolean().optional(),
  stabilityPartial: z.boolean().optional(),
  stabilityFinal: z.boolean().optional(),
  amv: z.boolean().optional(),
  pv: z.boolean().optional(),
  cv: z.boolean().optional(),
  createdBy: z.string().min(1),
});

const updateMfcSchema = mfcSchema.partial().extend({
  id: z.string().min(1),
});

// GET - Retrieve all MFC records for company and location
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const locationId = searchParams.get('locationId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    if (!companyId || !locationId) {
      return NextResponse.json(
        { error: 'Company ID and Location ID are required' },
        { status: 400 }
      );
    }

    // Build query with data isolation
    const query: any = { companyId, locationId };
    
    if (search) {
      query.$or = [
        { mfcNumber: { $regex: search, $options: 'i' } },
        { genericName: { $regex: search, $options: 'i' } },
        { columnCode: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    
    const [records, total] = await Promise.all([
      MFCMaster.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MFCMaster.countDocuments(query)
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
    console.error('Error fetching MFC records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MFC records' },
      { status: 500 }
    );
  }
}

// POST - Create new MFC record
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    
    // Validate request body
    const validatedData = mfcSchema.parse(body);

    // Check if MFC number already exists for this company/location
    const existingMFC = await MFCMaster.findOne({
      mfcNumber: validatedData.mfcNumber,
      companyId: validatedData.companyId,
      locationId: validatedData.locationId,
    });

    if (existingMFC) {
      return NextResponse.json(
        { error: 'MFC number already exists for this location' },
        { status: 409 }
      );
    }

    const newMFC = new MFCMaster(validatedData);
    const savedMFC = await newMFC.save();

    return NextResponse.json({
      message: 'MFC record created successfully',
      data: savedMFC,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating MFC record:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'MFC number already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create MFC record' },
      { status: 500 }
    );
  }
}

// PUT - Update MFC record
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    
    // Validate request body
    const validatedData = updateMfcSchema.parse(body);
    const { id, ...updateData } = validatedData;

    // Ensure data isolation - only update records belonging to the company/location
    const filter: any = { _id: id };
    if (updateData.companyId && updateData.locationId) {
      filter.companyId = updateData.companyId;
      filter.locationId = updateData.locationId;
    }

    const updatedMFC = await MFCMaster.findOneAndUpdate(
      filter,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedMFC) {
      return NextResponse.json(
        { error: 'MFC record not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'MFC record updated successfully',
      data: updatedMFC,
    });

  } catch (error: any) {
    console.error('Error updating MFC record:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update MFC record' },
      { status: 500 }
    );
  }
}

// DELETE - Delete MFC record
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const companyId = searchParams.get('companyId');
    const locationId = searchParams.get('locationId');

    if (!id || !companyId || !locationId) {
      return NextResponse.json(
        { error: 'ID, Company ID, and Location ID are required' },
        { status: 400 }
      );
    }

    // Ensure data isolation - only delete records belonging to the company/location
    const deletedMFC = await MFCMaster.findOneAndDelete({
      _id: id,
      companyId,
      locationId,
    });

    if (!deletedMFC) {
      return NextResponse.json(
        { error: 'MFC record not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'MFC record deleted successfully',
    });

  } catch (error: any) {
    console.error('Error deleting MFC record:', error);
    return NextResponse.json(
      { error: 'Failed to delete MFC record' },
      { status: 500 }
    );
  }
}