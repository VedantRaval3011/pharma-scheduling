import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MFCMaster from '@/models/MFCMaster';
import Department from '@/models/department';
import TestType from '@/models/test-type';
import DetectorType from '@/models/detectorType';
import Pharmacopoeial from '@/models/pharmacopeial';
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

// Validation schema for updating single MFC record
const updateSingleMfcSchema = z.object({
  mfcNumber: z.string().min(1, { message: 'MFC number is required' }).optional(),
  productIds: z
    .array(z.object({ id: z.string().min(1, { message: 'Product ID is required' }) }))
    .optional(),
  generics: z
    .array(
      z.object({
        genericName: z.string().min(1, { message: 'Generic name is required' }),
        apis: z.array(
          z.object({
            apiName: z.string().min(1, { message: 'API name is required' }),
            testTypes: z
              .array(testTypeSchema)
              .min(1, { message: 'At least one test type is required' }),
          })
        ).min(1, { message: 'At least one API is required' }),
      })
    )
    .optional(),
  departmentId: z.string().min(1, { message: 'Department ID is required' }).optional(),
  wash: z.string().optional(),
  updatedBy: z.string().min(1, { message: 'Updated by is required' }).optional(),
});

// GET - Retrieve single MFC record
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const locationId = searchParams.get('locationId');
    const populate = searchParams.get('populate') === 'true';

    if (!companyId || !locationId) {
      return NextResponse.json(
        { error: 'Company ID and Location ID are required' },
        { status: 400 }
      );
    }

    // Find the MFC record
    const mfcRecord = await MFCMaster.findOne({
      _id: params.id,
      companyId,
      locationId,
    });

    if (!mfcRecord) {
      return NextResponse.json(
        { error: 'MFC record not found' },
        { status: 404 }
      );
    }

    // If populate is requested, fetch related data
    if (populate) {
      const enrichedRecord = mfcRecord.toObject();

      // Fetch department data
      if (mfcRecord.departmentId) {
        try {
          const departmentData = await Department.findOne({
            _id: mfcRecord.departmentId,
            companyId,
            locationId,
          });
          if (departmentData) {
            enrichedRecord.departmentDetails = departmentData.toObject();
          }
        } catch (error) {
          console.warn('Error fetching department data:', error);
        }
      }

      // Fetch test type, detector type, and pharmacopoeial data
      for (const generic of enrichedRecord.generics) {
        for (const api of generic.apis) {
          for (const testType of api.testTypes) {
            try {
              // Fetch test type details
              if (testType.testTypeId) {
                const testTypeData = await TestType.findOne({
                  _id: testType.testTypeId,
                  companyId,
                  locationId,
                });
                if (testTypeData) {
                  testType.testTypeDetails = testTypeData.toObject();
                }
              }

              // Fetch detector type details
              if (testType.detectorTypeId) {
                const detectorTypeData = await DetectorType.findOne({
                  _id: testType.detectorTypeId,
                  companyId,
                  locationId,
                });
                if (detectorTypeData) {
                  testType.detectorTypeDetails = detectorTypeData.toObject();
                }
              }

              // Fetch pharmacopoeial details
              if (testType.pharmacopoeialId) {
                const pharmacopoeialData = await Pharmacopoeial.findOne({
                  _id: testType.pharmacopoeialId,
                  companyId,
                  locationId,
                });
                if (pharmacopoeialData) {
                  testType.pharmacopoeialDetails = pharmacopoeialData.toObject();
                }
              }
            } catch (error) {
              console.warn('Error fetching test type related data:', error);
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        data: enrichedRecord,
      });
    }

    return NextResponse.json({
      success: true,
      data: mfcRecord,
    });
  } catch (error) {
    console.error('Error fetching MFC record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update single MFC record
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const locationId = searchParams.get('locationId');

    if (!companyId || !locationId) {
      return NextResponse.json(
        { error: 'Company ID and Location ID are required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validatedData = updateSingleMfcSchema.parse(body);

    // Get old data for audit
    const oldMFC = await MFCMaster.findOne({
      _id: params.id,
      companyId,
      locationId,
    });

    if (!oldMFC) {
      return NextResponse.json(
        { error: 'MFC record not found or access denied' },
        { status: 404 }
      );
    }

    // Check if MFC number already exists for other records
    if (validatedData.mfcNumber) {
      const existingMFC = await MFCMaster.findOne({
        _id: { $ne: params.id },
        mfcNumber: validatedData.mfcNumber,
        companyId,
        locationId,
      });

      if (existingMFC) {
        return NextResponse.json(
          { error: 'MFC number already exists' },
          { status: 409 }
        );
      }
    }

    // Update the record
    const updatedRecord = await MFCMaster.findOneAndUpdate(
      {
        _id: params.id,
        companyId,
        locationId,
      },
      {
        ...validatedData,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedRecord) {
      return NextResponse.json(
        { error: 'MFC record not found' },
        { status: 404 }
      );
    }

    // Create audit log
    await createMFCAuditLog({
      mfcId: updatedRecord._id.toString(),
      mfcNumber: updatedRecord.mfcNumber,
      companyId: updatedRecord.companyId,
      locationId: updatedRecord.locationId,
      action: 'UPDATE',
      performedBy: validatedData.updatedBy || 'system',
      oldData: oldMFC.toObject(),
      newData: updatedRecord.toObject(),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'MFC record updated successfully',
      data: updatedRecord,
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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete single MFC record
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const locationId = searchParams.get('locationId');
    const deletedBy = searchParams.get('deletedBy');

    if (!companyId || !locationId) {
      return NextResponse.json(
        { error: 'Company ID and Location ID are required' },
        { status: 400 }
      );
    }

    // Get the record before deletion for audit
    const mfcToDelete = await MFCMaster.findOne({
      _id: params.id,
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
    const deletedRecord = await MFCMaster.findOneAndDelete({
      _id: params.id,
      companyId,
      locationId,
    });

    if (!deletedRecord) {
      return NextResponse.json(
        { error: 'MFC record not found' },
        { status: 404 }
      );
    }

    // Create audit log
    await createMFCAuditLog({
      mfcId: deletedRecord._id.toString(),
      mfcNumber: deletedRecord.mfcNumber,
      companyId: deletedRecord.companyId,
      locationId: deletedRecord.locationId,
      action: 'DELETE',
      performedBy: deletedBy || 'system',
      oldData: mfcToDelete.toObject(),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'MFC record deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting MFC record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}