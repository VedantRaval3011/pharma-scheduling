//api/admin/mfc
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import MFCMaster from '@/models/MFCMaster';
import Product from '@/models/product/product';
import { createMFCAuditLog } from '@/lib/auditUtils';
import { z } from 'zod';
import { IMFCMaster } from "@/models/MFCMaster";
import { FilterQuery } from 'mongoose';

async function syncMFCProductRelationship(
  mfcId: string,
  newProductIds: string[],
  oldProductIds: string[] = [],
  companyId: string,
  locationId: string
) {
  try {
    // Remove MFC from products that are no longer associated
    const productsToRemove = oldProductIds.filter(id => !newProductIds.includes(id));
    if (productsToRemove.length > 0) {
      await Product.updateMany(
        {
          _id: { $in: productsToRemove },
          companyId,
          locationId
        },
        {
          $pull: { mfcs: mfcId }
        }
      );
    }

    // Add MFC to new products
    const productsToAdd = newProductIds.filter(id => !oldProductIds.includes(id));
    if (productsToAdd.length > 0) {
      await Product.updateMany(
        {
          _id: { $in: productsToAdd },
          companyId,
          locationId
        },
        {
          $addToSet: { mfcs: mfcId }
        }
      );
    }
  } catch (error) {
    console.error('Error syncing MFC-Product relationship:', error);
    throw error;
  }
}


// Validation schema for TestType
const testTypeSchema = z.object({
  testTypeId: z.string().min(1, { message: 'Test type ID is required' }),
  selectMakeSpecific: z.boolean().default(false),
  columnCode: z.string().min(1, { message: 'Column code is required' }),
  mobilePhaseCodes: z
    .array(z.string())
    .length(6, { message: 'Must have exactly 6 mobile phase slots' }) // Ensure exactly 6 elements
    .refine(
      (codes) => {
        // At least MP01 (index 0) must be filled
        return codes[0] && codes[0].trim() !== "";
      },
      { message: 'MP01 (first mobile phase) is required' }
    ),
  detectorTypeId: z.string().min(1, { message: 'Detector type ID is required' }),
  pharmacopoeialId: z.string().min(1, { message: 'Pharmacopoeial ID is required' }),
  sampleInjection: z.number().min(0).default(0),
  standardInjection: z.number().min(0).default(0),
  blankInjection: z.number().min(0).default(0),
  bracketingFrequency: z.number().min(0).default(0),
  injectionTime: z.number().min(0).default(0),
  runTime: z.number().min(0).default(0),
  washTime: z.number().min(0).default(0),
  testApplicability: z.boolean().default(false),

  // ✅ Updated injections
  numberOfInjections: z.number().min(0).default(0).optional(),
  numberOfInjectionsAMV: z.number().min(0).default(0).optional(),
  numberOfInjectionsPV: z.number().min(0).default(0).optional(),
  numberOfInjectionsCV: z.number().min(0).default(0).optional(),

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

// Validation schema for creating MFC record with productIds
const mfcSchema = z.object({
  mfcNumber: z.string().min(1, { message: 'MFC number is required' }),
  companyId: z.string().uuid({ message: 'Valid company ID is required' }),
  locationId: z.string().uuid({ message: 'Valid location ID is required' }),
  productIds: z
    .array(z.string().min(0, { message: 'Product ID can be empty' }))
    .min(0, { message: 'Product IDs are optional' })
    .optional(),
  generics: z.array(genericSchema).min(1, { message: 'At least one generic is required' }),
  departmentId: z.string().min(1, { message: 'Department ID is required' }),
  wash: z.number().min(0).default(0),
  createdBy: z.string().min(1, { message: 'Created by is required' }),
});

// Validation schema for updating MFC record
const updateMfcSchema = mfcSchema.partial().extend({
  id: z.string().min(1, { message: 'ID is required' }),
});

// Helper function to validate product IDs exist
async function validateProductIds(
  productIds: string[],
  companyId: string,
  locationId: string
): Promise<{ valid: boolean; invalidIds: string[]; validProducts: any[] }> {
  try {
    const existingProducts = await Product.find({
      _id: { $in: productIds },
      companyId,
      locationId,
    }).select('_id name productCode');

    const foundIds = existingProducts.map(p => p._id.toString());
    const invalidIds = productIds.filter(id => !foundIds.includes(id));

    return {
      valid: invalidIds.length === 0,
      invalidIds,
      validProducts: existingProducts,
    };
  } catch (error) {
    console.error('Error validating product IDs:', error);
    return {
      valid: false,
      invalidIds: productIds,
      validProducts: [],
    };
  }
}

// Helper function to build search query with productIds
export async function buildSearchQuery(
  companyId: string,
  locationId: string,
  search?: string,
  productId?: string
): Promise<FilterQuery<IMFCMaster>> {
  const query: FilterQuery<IMFCMaster> = {
    companyId,
    locationId,
  };

  // Optional product filter
  if (productId) {
    query.productIds = { $in: [productId] };
  }

  // Optional text search
  if (search && search.trim() !== "") {
    const regex = new RegExp(search, "i"); // case-insensitive

    query.$or = [
      { mfcNumber: regex },
      { "generics.genericName": regex },
      { "generics.apis.apiName": regex },
      { "generics.apis.testTypes.columnCode": regex },
      { "generics.apis.testTypes.detectorTypeId": regex },
      { "generics.apis.testTypes.pharmacopoeialId": regex },
    ];
  }

  return query;
}



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
    const populate = searchParams.get('populate') === 'true';
    const productId = searchParams.get('productId');

    if (!companyId || !locationId) {
      return NextResponse.json(
        { error: 'Company ID and Location ID are required' },
        { status: 400 }
      );
    }

    // Make buildSearchQuery async
    let query = await buildSearchQuery(companyId, locationId, search);

    if (productId) {
      query.productIds = { $in: [productId] };
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

    let enrichedRecords = records;
    if (populate) {
      enrichedRecords = await Promise.all(
        records.map(async (record) => {
          if (record.productIds && record.productIds.length > 0) {
            try {
              const productDetails = await Product.find({
                _id: { $in: record.productIds },
                companyId: record.companyId,
                locationId: record.locationId,
              }).select('_id name productCode description').lean();
              
              return {
                ...record,
                productDetails,
              };
            } catch (error) {
              console.warn('Error fetching product details:', error);
              return record;
            }
          }
          return record;
        })
      );
    }

    const statistics = {
      totalRecords: total,
      recordsWithProducts: await MFCMaster.countDocuments({
        companyId,
        locationId,
        productIds: { $exists: true, $not: { $size: 0 } },
      }),
    };

    return NextResponse.json({
      success: true,
      data: enrichedRecords,
      statistics,
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
      { error: 'Failed to fetch MFC records', details: error.message },
      { status: 500 }
    );
  }
}


// POST - Create new MFC record with audit logging
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const validatedData = mfcSchema.parse(body);

    // Only validate product IDs if they are provided
    if (validatedData.productIds && validatedData.productIds.length > 0) {
      const productValidation = await validateProductIds(
        validatedData.productIds,
        validatedData.companyId,
        validatedData.locationId
      );

      if (!productValidation.valid) {
        return NextResponse.json(
          {
            error: 'Invalid product IDs provided',
            invalidIds: productValidation.invalidIds,
            message: `The following product IDs are invalid or do not exist: ${productValidation.invalidIds.join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

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

    const mfcData = { 
      ...validatedData,
      // Ensure productIds is always an array (empty if not provided)
      productIds: validatedData.productIds || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newMFC = new MFCMaster(mfcData);
    const savedMFC = await newMFC.save();

    // Only sync with Product Master if products are provided
    if (validatedData.productIds && validatedData.productIds.length > 0) {
      await syncMFCProductRelationship(
        savedMFC._id.toString(),
        validatedData.productIds,
        [],
        validatedData.companyId,
        validatedData.locationId
      );
    }

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

    const successMessage = validatedData.productIds?.length 
      ? `MFC record created successfully and synced with ${validatedData.productIds.length} Product record(s)`
      : 'MFC record created successfully without product associations';

    return NextResponse.json(
      {
        success: true,
        message: successMessage,
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
      { error: 'Failed to create MFC record', details: error.message },
      { status: 500 }
    );
  }
}


// PUT - Update MFC record with audit logging
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const validatedData = updateMfcSchema.parse(body);
    const { id, ...updateData } = validatedData;

    // Only validate product IDs if they are provided
    if (updateData.productIds && updateData.productIds.length > 0) {
      const productValidation = await validateProductIds(
        updateData.productIds,
        updateData.companyId!,
        updateData.locationId!
      );

      if (!productValidation.valid) {
        return NextResponse.json(
          {
            error: 'Invalid product IDs provided',
            invalidIds: productValidation.invalidIds,
            message: `The following product IDs are invalid or do not exist: ${productValidation.invalidIds.join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    const filter: any = { _id: id };
    if (updateData.companyId && updateData.locationId) {
      filter.companyId = updateData.companyId;
      filter.locationId = updateData.locationId;
    }

    const oldMFC = await MFCMaster.findOne(filter);
    if (!oldMFC) {
      return NextResponse.json(
        { error: 'MFC record not found or access denied' },
        { status: 404 }
      );
    }

    if (updateData.mfcNumber) {
      const existingMFC = await MFCMaster.findOne({
        _id: { $ne: id },
        mfcNumber: updateData.mfcNumber,
        companyId: updateData.companyId || oldMFC.companyId,
        locationId: updateData.locationId || oldMFC.locationId,
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
      { 
        ...updateData, 
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedMFC) {
      return NextResponse.json(
        { error: 'MFC record not found or access denied' },
        { status: 404 }
      );
    }

    // Sync with Product Master - handle empty arrays
    const oldProductIds = oldMFC.productIds?.map((id: any) => id.toString()) || [];
    const newProductIds = updateData.productIds || oldMFC.productIds?.map((id: any) => id.toString()) || [];

    await syncMFCProductRelationship(
      id,
      newProductIds,
      oldProductIds,
      updatedMFC.companyId,
      updatedMFC.locationId
    );

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

    const successMessage = newProductIds.length 
      ? `MFC record updated successfully and synced with ${newProductIds.length} Product record(s)`
      : 'MFC record updated successfully without product associations';

    return NextResponse.json({
      success: true,
      message: successMessage,
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
      { error: 'Failed to update MFC record', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Bulk delete MFC records
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const locationId = searchParams.get('locationId');
    const deletedBy = searchParams.get('deletedBy') || 'system';

    if (!companyId || !locationId) {
      return NextResponse.json(
        { error: 'Company ID and Location ID are required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Array of IDs is required' },
        { status: 400 }
      );
    }

    const recordsToDelete = await MFCMaster.find({
      _id: { $in: ids },
      companyId,
      locationId,
    });

    if (recordsToDelete.length === 0) {
      return NextResponse.json(
        { error: 'No records found to delete' },
        { status: 404 }
      );
    }

    const deleteResult = await MFCMaster.deleteMany({
      _id: { $in: ids },
      companyId,
      locationId,
    });

    const auditPromises = recordsToDelete.map(record =>
      createMFCAuditLog({
        mfcId: record._id.toString(),
        mfcNumber: record.mfcNumber,
        companyId: record.companyId,
        locationId: record.locationId,
        action: 'DELETE',
        performedBy: deletedBy,
        oldData: record.toObject(),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      })
    );

    await Promise.all(auditPromises);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleteResult.deletedCount} MFC records`,
      deletedCount: deleteResult.deletedCount,
    });
  } catch (error: any) {
    console.error('Error deleting MFC records:', error);
    return NextResponse.json(
      { error: 'Failed to delete MFC records', details: error.message },
      { status: 500 }
    );
  }
}