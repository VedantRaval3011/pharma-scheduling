import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import MFCMaster from '@/models/MFCMaster';
import { createMFCAuditLog } from '@/lib/auditUtils';
import { z } from 'zod';

// Validation schema for TestType
const testTypeSchema = z.object({
  testTypeId: z.string().min(1, { message: 'Test type ID is required' }),
  columnCode: z.string().min(1, { message: 'Column code is required' }),
  mobilePhaseCodes: z
    .array(z.string())
    .transform(codes => codes.filter(code => code.trim() !== ''))
    .refine(codes => codes.length >= 1, {
      message: 'At least one mobile phase code is required',
    }),
  detectorTypeId: z.string().min(1, { message: 'Detector type ID is required' }),
  pharmacopoeialId: z.string().min(1, { message: 'Pharmacopoeial ID is required' }),
  sampleInjection: z.number().min(0).default(0),
  standardInjection: z.number().min(0).default(0),
  blankInjection: z.number().min(0).default(0),
  bracketingFrequency: z.number().min(0).default(0),
  injectionTime: z.number().min(0).default(0),
  runTime: z.number().min(0).default(0),
  testApplicability: z.boolean().default(false),
  numberOfInjections: z.number().min(0).default(0).optional(),
  // Updated test type flags
  bulk: z.boolean().default(false),
  fp: z.boolean().default(false),
  stabilityPartial: z.boolean().default(false),
  stabilityFinal: z.boolean().default(false),
  amv: z.boolean().default(false),
  pv: z.boolean().default(false),
  cv: z.boolean().default(false),
  isLinked: z.boolean().default(false),
});

// Validation schema for API
const apiSchema = z.object({
  apiName: z.string().min(1, { message: 'API name is required' }),
  testTypes: z.array(testTypeSchema).min(1, { message: 'At least one test type is required' }),
});

// Validation schema for Generic
const genericSchema = z.object({
  genericName: z.string().min(1, { message: 'Generic name is required' }),
  apis: z.array(apiSchema).min(1, { message: 'At least one API is required' }),
});

// Validation schema for ProductId
const productIdSchema = z.object({
  id: z.string().min(1, { message: 'Product ID is required' }),
});

// Validation schema for creating MFC record
const mfcSchema = z.object({
  mfcNumber: z.string().min(1, { message: 'MFC number is required' }),
  companyId: z.string().uuid({ message: 'Valid company ID is required' }),
  locationId: z.string().uuid({ message: 'Valid location ID is required' }),
  productIds: z.array(productIdSchema).min(1, { message: 'At least one product ID is required' }),
  generics: z.array(genericSchema).min(1, { message: 'At least one generic is required' }),
  departmentId: z.string().min(1, { message: 'Department ID is required' }),
  wash: z.string().default(''),
  createdBy: z.string().min(1, { message: 'Created by is required' }),
});

// Validation schema for updating MFC record
const updateMfcSchema = mfcSchema.partial().extend({
  id: z.string().min(1, { message: 'ID is required' }),
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

    const query: any = { companyId, locationId };

    if (search) {
      query.$or = [
        { mfcNumber: { $regex: search, $options: 'i' } },
        { 'generics.genericName': { $regex: search, $options: 'i' } },
        { 'generics.apis.apiName': { $regex: search, $options: 'i' } },
        { 'generics.apis.testTypes.columnCode': { $regex: search, $options: 'i' } },
        { 'productIds.id': { $regex: search, $options: 'i' } },
        { wash: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      MFCMaster.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MFCMaster.countDocuments(query),
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

// POST - Create new MFC record with audit logging
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

    // Create audit log
    await createMFCAuditLog({
      mfcId: savedMFC._id.toString(),
      mfcNumber: savedMFC.mfcNumber,
      companyId: savedMFC.companyId,
      locationId: savedMFC.locationId,
      action: 'CREATE',
      performedBy: validatedData.createdBy,
      newData: savedMFC.toObject(),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json(
      {
        message: 'MFC record created successfully',
        data: savedMFC,
      },
      { status: 201 }
    );
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

// PUT - Update MFC record with audit logging
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();

    // Validate request body
    const validatedData = updateMfcSchema.parse(body);
    const { id, ...updateData } = validatedData;

    // Ensure data isolation
    const filter: any = { _id: id };
    if (updateData.companyId && updateData.locationId) {
      filter.companyId = updateData.companyId;
      filter.locationId = updateData.locationId;
    }

    // Get old data for audit
    const oldMFC = await MFCMaster.findOne(filter);
    if (!oldMFC) {
      return NextResponse.json(
        { error: 'MFC record not found or access denied' },
        { status: 404 }
      );
    }

    // Check if MFC number already exists for other records
    if (updateData.mfcNumber) {
      const existingMFC = await MFCMaster.findOne({
        _id: { $ne: id },
        mfcNumber: updateData.mfcNumber,
        companyId: updateData.companyId,
        locationId: updateData.locationId,
      });

      if (existingMFC) {
        return NextResponse.json(
          { error: 'MFC number already exists for another record' },
          { status: 409 }
        );
      }
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

    // Create audit log
    await createMFCAuditLog({
      mfcId: updatedMFC._id.toString(),
      mfcNumber: updatedMFC.mfcNumber,
      companyId: updatedMFC.companyId,
      locationId: updatedMFC.locationId,
      action: 'UPDATE',
      performedBy: updateData.createdBy || 'system',
      oldData: oldMFC.toObject(),
      newData: updatedMFC.toObject(),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

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

// DELETE - Delete MFC record with audit logging
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const companyId = searchParams.get('companyId');
    const locationId = searchParams.get('locationId');
    const deletedBy = searchParams.get('deletedBy');

    if (!id || !companyId || !locationId) {
      return NextResponse.json(
        { error: 'ID, Company ID, and Location ID are required' },
        { status: 400 }
      );
    }

    // Get the record before deletion for audit
    const mfcToDelete = await MFCMaster.findOne({
      _id: id,
      companyId,
      locationId,
    });

    if (!mfcToDelete) {
      return NextResponse.json(
        { error: 'MFC record not found or access denied' },
        { status: 404 }
      );
    }

    // Delete the record
    const deletedMFC = await MFCMaster.findOneAndDelete({
      _id: id,
      companyId,
      locationId,
    });

    // Create audit log
    if (deletedMFC) {
      await createMFCAuditLog({
        mfcId: deletedMFC._id.toString(),
        mfcNumber: deletedMFC.mfcNumber,
        companyId: deletedMFC.companyId,
        locationId: deletedMFC.locationId,
        action: 'DELETE',
        performedBy: deletedBy || 'system',
        oldData: mfcToDelete.toObject(),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });
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