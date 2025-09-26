import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import MFCMaster from "@/models/MFCMaster";
import Product from "@/models/product/product";
import { createMFCAuditLog } from "@/lib/auditUtils";
import { z } from "zod";
import { IMFCMaster } from "@/models/MFCMaster";
import { FilterQuery } from "mongoose";
import { isValidObjectId } from "mongoose";

async function syncMFCProductRelationship(
  mfcId: string,
  newProductIds: string[],
  oldProductIds: string[] = [],
  companyId: string,
  locationId: string
) {
  try {
    // Remove MFC from products that are no longer associated
    const productsToRemove = oldProductIds.filter(
      (id) => !newProductIds.includes(id)
    );
    if (productsToRemove.length > 0) {
      await Product.updateMany(
        {
          _id: { $in: productsToRemove },
          companyId,
          locationId,
        },
        {
          $pull: { mfcs: mfcId },
        }
      );
    }

    // Add MFC to new products
    const productsToAdd = newProductIds.filter(
      (id) => !oldProductIds.includes(id)
    );
    if (productsToAdd.length > 0) {
      await Product.updateMany(
        {
          _id: { $in: productsToAdd },
          companyId,
          locationId,
        },
        {
          $addToSet: { mfcs: mfcId },
        }
      );
    }
  } catch (error) {
    console.error("Error syncing MFC-Product relationship:", error);
    throw error;
  }
}

// Updated validation schema for TestType with new fields
const testTypeSchema = z.object({
  testTypeId: z.string().min(1, { message: "Test type ID is required" }),
  selectMakeSpecific: z.boolean().default(false),
  columnCode: z.string().min(1, { message: "Column code is required" }),
  isColumnCodeLinkedToMfc: z.boolean().default(false),
  mobilePhaseCodes: z
    .array(z.string())
    .length(6, { message: "Must have exactly 6 mobile phase slots" })
    .refine((codes) => codes[0] && codes[0].trim() !== "", {
      message: "MP01 (first mobile phase) is required",
    }),
  mobilePhaseRatios: z
    .array(z.number().min(0))
    .length(6, { message: "Must have exactly 6 mobile phase ratios" })
    .default([0, 0, 0, 0, 0, 0])
    .optional(),

  // ✅ NEW: Flow Rates validation (optional)
  flowRates: z
    .array(z.number().min(0))
    .length(2, { message: "Must have exactly 2 flow rates for MP05 and MP06" })
    .default([0, 0])
    .optional(),
  systemFlowRate: z
    .number()
    .min(0, { message: "System flow rate must be non-negative" })
    .default(0)
    .optional(),

  washFlowRate: z
    .number()
    .min(0, { message: "Wash flow rate must be non-negative" })
    .default(0)
    .optional(),
  detectorTypeId: z
    .string()
    .min(1, { message: "Detector type ID is required" }),
  // Updated to array for multi-select
  pharmacopoeialId: z
    .array(z.string().min(1, { message: "Pharmacopoeial ID cannot be empty" }))
    .min(1, { message: "At least one Pharmacopoeial ID is required" }),
  sampleInjection: z.number().min(0).default(0),
  standardInjection: z.number().min(0).default(0),
  blankInjection: z.number().min(0).default(0),
  systemSuitability: z.number().min(0).default(0),
  sensitivity: z.number().min(0).default(0),
  placebo: z.number().min(0).default(0),
  reference1: z.number().min(0).default(0),
  reference2: z.number().min(0).default(0),
  bracketingFrequency: z.number().min(0).default(0),
  injectionTime: z.number().min(0).default(0),
  runTime: z.number().min(0).default(0),
  uniqueRuntimes: z.boolean().default(false),

  // Existing runtime fields
  blankRunTime: z.number().min(0).default(0).optional(),
  standardRunTime: z.number().min(0).default(0).optional(),
  sampleRunTime: z.number().min(0).default(0).optional(),

  // NEW: Additional runtime fields
  systemSuitabilityRunTime: z.number().min(0).default(0).optional(),
  sensitivityRunTime: z.number().min(0).default(0).optional(),
  placeboRunTime: z.number().min(0).default(0).optional(),
  reference1RunTime: z.number().min(0).default(0).optional(),
  reference2RunTime: z.number().min(0).default(0).optional(),

  washTime: z.number().min(0).default(0),
  testApplicability: z.boolean().default(false),
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
  priority: z.enum(["urgent", "high", "normal"]).default("normal"),

  // NEW: Outsourced test field
  isOutsourcedTest: z.boolean().default(false),
});

// Validation schema for API
const apiSchema = z.object({
  apiName: z.string().min(1, { message: "API name is required" }),
  testTypes: z
    .array(testTypeSchema)
    .min(1, { message: "At least one test type is required" }),
});

// Validation schema for Generic
const genericSchema = z.object({
  genericName: z.string().min(1, { message: "Generic name is required" }),
  apis: z.array(apiSchema).min(1, { message: "At least one API is required" }),
});

// Updated validation schema for creating MFC record with new fields
const mfcSchema = z.object({
  mfcNumber: z.string().min(1, { message: "MFC number is required" }),
  companyId: z.string().uuid({ message: "Valid company ID is required" }),
  locationId: z.string().uuid({ message: "Valid location ID is required" }),
  productIds: z
    .array(z.string().min(0, { message: "Product ID can be empty" }))
    .min(0, { message: "Product IDs are optional" })
    .optional(),
  generics: z
    .array(genericSchema)
    .min(1, { message: "At least one generic is required" }),
  departmentId: z.string().min(1, { message: "Department ID is required" }),
  wash: z.number().min(0).default(0),
  createdBy: z.string().min(1, { message: "Created by is required" }),
  priority: z.enum(["urgent", "high", "normal"]).default("normal"),

  // NEW: MFC-level fields
  isObsolete: z.boolean().default(false).optional(),
  isRawMaterial: z.boolean().default(false).optional(),
});

// Validation schema for updating MFC record
const updateMfcSchema = mfcSchema.partial().extend({
  id: z.string().min(1, { message: "ID is required" }),
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
    }).select("_id name productCode");

    const foundIds = existingProducts.map((p) => p._id.toString());
    const invalidIds = productIds.filter((id) => !foundIds.includes(id));

    return {
      valid: invalidIds.length === 0,
      invalidIds,
      validProducts: existingProducts,
    };
  } catch (error) {
    console.error("Error validating product IDs:", error);
    return {
      valid: false,
      invalidIds: productIds,
      validProducts: [],
    };
  }
}

export async function buildSearchQuery(
  companyId: string,
  locationId: string,
  search?: string,
  productId?: string | null,
  isObsolete?: string | null,
  isRawMaterial?: string | null
): Promise<FilterQuery<IMFCMaster>> {
  const query: FilterQuery<IMFCMaster> = {
    companyId,
    locationId,
  };

  // Handle obsolete filter
  if (isObsolete === "true") {
    query.isObsolete = true;
  } else if (isObsolete === "false") {
    // Show records where isObsolete is false or doesn't exist (null/undefined)
    query.$or = [
      { isObsolete: { $exists: false } },
      { isObsolete: false },
      { isObsolete: null },
    ];
  }

  // Handle raw material filter
  if (isRawMaterial === "true") {
    query.isRawMaterial = true;
  } else if (isRawMaterial === "false") {
    // Show records where isRawMaterial is false or doesn't exist (null/undefined)
    if (query.$or) {
      // If we already have $or from isObsolete, we need to use $and
      query.$and = [
        { $or: query.$or }, // Previous $or condition
        {
          $or: [
            { isRawMaterial: { $exists: false } },
            { isRawMaterial: false },
            { isRawMaterial: null },
          ],
        },
      ];
      delete query.$or;
    } else {
      query.$or = [
        { isRawMaterial: { $exists: false } },
        { isRawMaterial: false },
        { isRawMaterial: null },
      ];
    }
  }

  // Optional product filter
  if (productId) {
    if (query.$and) {
      query.$and.push({ productIds: { $in: [productId] } });
    } else {
      query.productIds = { $in: [productId] };
    }
  }

  // Optional text search - updated to include new array field
  if (search && search.trim() !== "") {
    const regex = new RegExp(search, "i"); // case-insensitive

    const searchCondition = {
      $or: [
        { mfcNumber: regex },
        { "generics.genericName": regex },
        { "generics.apis.apiName": regex },
        { "generics.apis.testTypes.columnCode": regex },
        { "generics.apis.testTypes.detectorTypeId": regex },
        // Updated to handle array of pharmacopoeialId
        { "generics.apis.testTypes.pharmacopoeialId": { $in: [regex] } },
      ],
    };

    if (query.$and) {
      query.$and.push(searchCondition);
    } else if (query.$or) {
      // If we have $or but no $and, convert to $and
      query.$and = [{ $or: query.$or }, searchCondition];
      delete query.$or;
    } else {
      query.$or = searchCondition.$or;
    }
  }

  return query;
}

// GET - Retrieve all MFC records for company and location (updated to handle new fields)

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const locationId = searchParams.get("locationId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const populate = searchParams.get("populate") === "true";
    const productId = searchParams.get("productId");
    const isObsolete = searchParams.get("isObsolete");
    const isRawMaterial = searchParams.get("isRawMaterial");

    if (!companyId || !locationId) {
      return NextResponse.json(
        { error: "Company ID and Location ID are required" },
        { status: 400 }
      );
    }

    // Validate productId if provided
    if (productId && !isValidObjectId(productId)) {
      return NextResponse.json(
        { error: `Invalid productId provided: ${productId}` },
        { status: 400 }
      );
    }

    // Build query with the new filter parameters
    const query = await buildSearchQuery(
      companyId,
      locationId,
      search,
      productId,
      isObsolete,
      isRawMaterial
    );

    console.log("Built query:", JSON.stringify(query, null, 2)); // Debug log

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
              })
                .select("_id name productCode description")
                .lean();

              return {
                ...record,
                productDetails,
              };
            } catch (error) {
              console.warn("Error fetching product details:", error);
              return record;
            }
          }
          return record;
        })
      );
    }

    // Enhanced statistics with breakdown by filter type
    const baseStatsQuery = { companyId, locationId };

    const statistics = {
      totalRecords: total,
      recordsWithProducts: await MFCMaster.countDocuments({
        ...baseStatsQuery,
        productIds: { $exists: true, $not: { $size: 0 } },
      }),
      activeRecords: await MFCMaster.countDocuments({
        ...baseStatsQuery,
        $and: [
          {
            $or: [
              { isObsolete: { $exists: false } },
              { isObsolete: false },
              { isObsolete: null },
            ],
          },
          {
            $or: [
              { isRawMaterial: { $exists: false } },
              { isRawMaterial: false },
              { isRawMaterial: null },
            ],
          },
        ],
      }),
      obsoleteRecords: await MFCMaster.countDocuments({
        ...baseStatsQuery,
        isObsolete: true,
      }),
      rawMaterialRecords: await MFCMaster.countDocuments({
        ...baseStatsQuery,
        isRawMaterial: true,
      }),
      outsourcedTestRecords: await MFCMaster.countDocuments({
        ...baseStatsQuery,
        "generics.apis.testTypes.isOutsourcedTest": true,
      }),
      currentFilter: {
        isObsolete: isObsolete,
        isRawMaterial: isRawMaterial,
        search: search,
        productId: productId,
        resultsCount: total,
      },
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
      appliedFilters: {
        isObsolete,
        isRawMaterial,
        search,
        productId,
      },
    });
  } catch (error: any) {
    console.error("Error fetching MFC records:", error);
    return NextResponse.json(
      { error: "Failed to fetch MFC records", details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new MFC record with audit logging (updated for new fields)
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
            error: "Invalid product IDs provided",
            invalidIds: productValidation.invalidIds,
            message: `The following product IDs are invalid or do not exist: ${productValidation.invalidIds.join(
              ", "
            )}`,
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
        { error: "MFC number already exists for this location" },
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
      action: "CREATE",
      performedBy: validatedData.createdBy,
      newData: savedMFC.toObject(),
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    const successMessage = validatedData.productIds?.length
      ? `MFC record created successfully and synced with ${validatedData.productIds.length} Product record(s)`
      : "MFC record created successfully without product associations";

    return NextResponse.json(
      {
        success: true,
        message: successMessage,
        data: savedMFC,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating MFC record:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    if (error.code === 11000) {
      return NextResponse.json(
        { error: "MFC number already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create MFC record", details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update MFC record with audit logging (updated for new fields)
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
            error: "Invalid product IDs provided",
            invalidIds: productValidation.invalidIds,
            message: `The following product IDs are invalid or do not exist: ${productValidation.invalidIds.join(
              ", "
            )}`,
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
        { error: "MFC record not found or access denied" },
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
          { error: "MFC number already exists for another record" },
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
        { error: "MFC record not found or access denied" },
        { status: 404 }
      );
    }

    // Sync with Product Master - handle empty arrays
    const oldProductIds =
      oldMFC.productIds?.map((id: any) => id.toString()) || [];
    const newProductIds =
      updateData.productIds ||
      oldMFC.productIds?.map((id: any) => id.toString()) ||
      [];

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
      action: "UPDATE",
      performedBy: updateData.createdBy || "system",
      oldData: oldMFC.toObject(),
      newData: updatedMFC.toObject(),
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    const successMessage = newProductIds.length
      ? `MFC record updated successfully and synced with ${newProductIds.length} Product record(s)`
      : "MFC record updated successfully without product associations";

    return NextResponse.json({
      success: true,
      message: successMessage,
      data: updatedMFC,
    });
  } catch (error: any) {
    console.error("Error updating MFC record:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update MFC record", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Bulk delete MFC records (unchanged functionality)
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const locationId = searchParams.get("locationId");
    const deletedBy = searchParams.get("deletedBy") || "system";

    if (!companyId || !locationId) {
      return NextResponse.json(
        { error: "Company ID and Location ID are required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Array of IDs is required" },
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
        { error: "No records found to delete" },
        { status: 404 }
      );
    }

    const deleteResult = await MFCMaster.deleteMany({
      _id: { $in: ids },
      companyId,
      locationId,
    });

    const auditPromises = recordsToDelete.map((record) =>
      createMFCAuditLog({
        mfcId: record._id.toString(),
        mfcNumber: record.mfcNumber,
        companyId: record.companyId,
        locationId: record.locationId,
        action: "DELETE",
        performedBy: deletedBy,
        oldData: record.toObject(),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      })
    );

    await Promise.all(auditPromises);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleteResult.deletedCount} MFC records`,
      deletedCount: deleteResult.deletedCount,
    });
  } catch (error: any) {
    console.error("Error deleting MFC records:", error);
    return NextResponse.json(
      { error: "Failed to delete MFC records", details: error.message },
      { status: 500 }
    );
  }
}
