import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import MFCMaster from "@/models/MFCMaster";
import Department from "@/models/department";
import TestType from "@/models/test-type";
import DetectorType from "@/models/detectorType";
import Pharmacopoeial from "@/models/pharmacopeial";
import Product from "@/models/product/product";
import { createMFCAuditLog } from "@/lib/auditUtils";
import { z } from "zod";

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
  // ✅ NEW: Mobile Phase Ratios validation (optional)
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

// Updated validation schema for MFC Master with new fields
const updateSingleMfcSchema = z.object({
  mfcNumber: z
    .string()
    .min(1, { message: "MFC number is required" })
    .optional(),
  productIds: z
    .array(z.string().min(1, { message: "Product ID cannot be empty" }))
    .min(0, { message: "Product IDs are optional" })
    .optional(),
  generics: z
    .array(
      z.object({
        genericName: z.string().min(1, { message: "Generic name is required" }),
        apis: z
          .array(
            z.object({
              apiName: z.string().min(1, { message: "API name is required" }),
              testTypes: z
                .array(testTypeSchema)
                .min(1, { message: "At least one test type is required" }),
            })
          )
          .min(1, { message: "At least one API is required" }),
      })
    )
    .optional(),
  departmentId: z
    .string()
    .min(1, { message: "Department ID is required" })
    .optional(),
  wash: z.number().min(0).optional(),
  updatedBy: z
    .string()
    .min(1, { message: "Updated by is required" })
    .optional(),
  priority: z.enum(["urgent", "high", "normal"]).default("normal").optional(),

  // NEW: MFC-level fields
  isObsolete: z.boolean().default(false).optional(),
  isRawMaterial: z.boolean().default(false).optional(),
});

// Helper function to safely convert productId to valid ObjectId string
function safeProductIdToString(productId: any): string | null {
  try {
    if (!productId) return null;

    if (typeof productId === "string") {
      if (/^[0-9a-fA-F]{24}$/.test(productId)) {
        return productId;
      }
      return null;
    }

    if (Buffer.isBuffer(productId)) {
      const hexString = productId.toString("hex");
      if (hexString.length === 24 && /^[0-9a-fA-F]{24}$/.test(hexString)) {
        return hexString;
      }
      return null;
    }

    if (productId && typeof productId === "object") {
      if (productId.id) {
        return safeProductIdToString(productId.id);
      }
      if (productId._id) {
        return safeProductIdToString(productId._id);
      }
      if (productId.toString && typeof productId.toString === "function") {
        const idString = productId.toString();
        if (/^[0-9a-fA-F]{24}$/.test(idString)) {
          return idString;
        }
      }
    }

    return null;
  } catch (error) {
    console.warn("Error converting productId to string:", error);
    return null;
  }
}

// Helper function to validate product IDs exist
async function validateProductIds(
  productIds: string[],
  companyId: string,
  locationId: string
): Promise<{ valid: boolean; invalidIds: string[] }> {
  try {
    const validProductIds = productIds
      .map((id) => safeProductIdToString(id))
      .filter((id): id is string => id !== null);

    if (validProductIds.length === 0) {
      return {
        valid: false,
        invalidIds: productIds,
      };
    }

    const existingProducts = await Product.find({
      _id: { $in: validProductIds },
      companyId,
      locationId,
    }).select("_id");

    const foundIds = existingProducts.map((p) => p._id.toString());
    const invalidIds = productIds.filter((id) => {
      const validId = safeProductIdToString(id);
      return !validId || !foundIds.includes(validId);
    });

    return {
      valid: invalidIds.length === 0,
      invalidIds,
    };
  } catch (error) {
    console.error("Error validating product IDs:", error);
    return {
      valid: false,
      invalidIds: productIds,
    };
  }
}

// Helper function to populate related data
async function populateRelatedData(
  enrichedRecord: any,
  companyId: string,
  locationId: string
) {
  if (enrichedRecord.departmentId) {
    try {
      const departmentData = await Department.findOne({
        _id: enrichedRecord.departmentId,
        companyId,
        locationId,
      });
      if (departmentData && typeof departmentData.toObject === "function") {
        enrichedRecord.departmentDetails = departmentData.toObject();
      }
    } catch (error) {
      console.warn("Error fetching department data:", error);
    }
  }

  if (enrichedRecord.productIds?.length > 0) {
    try {
      const validProductIds: string[] = enrichedRecord.productIds
        .map((productId: any) => safeProductIdToString(productId))
        .filter((id: string | null): id is string => id !== null);

      if (validProductIds.length > 0) {
        const productsData = await Product.find({
          _id: { $in: validProductIds },
          companyId,
          locationId,
        });

        if (productsData.length > 0) {
          enrichedRecord.productDetails = productsData
            .filter((p) => p && typeof p.toObject === "function")
            .map((p) => p.toObject());
        }
      } else {
        console.warn("No valid product IDs found after conversion");
      }
    } catch (error) {
      console.warn("Error fetching products data:", error);
    }
  }

  for (const generic of enrichedRecord.generics || []) {
    for (const api of generic.apis || []) {
      for (const testType of api.testTypes || []) {
        try {
          const [testTypeData, detectorTypeData, pharmacopoeialData] =
            await Promise.allSettled([
              testType.testTypeId
                ? TestType.findOne({
                    _id: testType.testTypeId,
                    companyId,
                    locationId,
                  })
                : Promise.resolve(null),
              testType.detectorTypeId
                ? DetectorType.findOne({
                    _id: testType.detectorTypeId,
                    companyId,
                    locationId,
                  })
                : Promise.resolve(null),
              testType.pharmacopoeialId && testType.pharmacopoeialId.length > 0
                ? Pharmacopoeial.find({
                    _id: { $in: testType.pharmacopoeialId },
                    companyId,
                    locationId,
                  })
                : Promise.resolve(null),
            ]);

          if (
            testTypeData.status === "fulfilled" &&
            testTypeData.value &&
            typeof testTypeData.value.toObject === "function"
          ) {
            testType.testTypeDetails = testTypeData.value.toObject();
          }

          if (
            detectorTypeData.status === "fulfilled" &&
            detectorTypeData.value &&
            typeof detectorTypeData.value.toObject === "function"
          ) {
            testType.detectorTypeDetails = detectorTypeData.value.toObject();
          }

          if (
            pharmacopoeialData.status === "fulfilled" &&
            pharmacopoeialData.value
          ) {
            if (Array.isArray(pharmacopoeialData.value)) {
              testType.pharmacopoeialDetails = pharmacopoeialData.value
                .filter((p) => p && typeof p.toObject === "function")
                .map((p) => p.toObject());
            } else if (
              (pharmacopoeialData.value as any) &&
              typeof (pharmacopoeialData.value as any).toObject === "function"
            ) {
              testType.pharmacopoeialDetails = [
                (pharmacopoeialData.value as any).toObject(),
              ];
            }
          }
        } catch (error) {
          console.warn("Error fetching test type related data:", error);
        }
      }
    }
  }
}

// GET - Retrieve single MFC record (unchanged functionality, will include new fields)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const locationId = searchParams.get("locationId");
    const populate = searchParams.get("populate") === "true";

    if (!companyId || !locationId) {
      return NextResponse.json(
        { error: "Company ID and Location ID are required" },
        { status: 400 }
      );
    }

    const mfcRecord = await MFCMaster.findOne({
      _id: id,
      companyId,
      locationId,
    });

    if (!mfcRecord) {
      return NextResponse.json(
        { error: "MFC record not found" },
        { status: 404 }
      );
    }

    const enrichedRecord = mfcRecord.toObject();

    if (enrichedRecord.productIds && enrichedRecord.productIds.length > 0) {
      try {
        const validProductIds: string[] = enrichedRecord.productIds
          .map((productId: any) => safeProductIdToString(productId))
          .filter((id: string | null): id is string => id !== null);

        if (validProductIds.length > 0) {
          const productDetails = await Product.find({
            _id: { $in: validProductIds },
            companyId,
            locationId,
          })
            .select("_id productCode productName")
            .lean();

          enrichedRecord.productIds = validProductIds.map(
            (productId: string) => {
              const product = productDetails.find(
                (p: { _id: any; productCode?: string; productName?: string }) =>
                  p._id.toString() === productId
              );
              return {
                id: productId,
                productCode: product?.productCode || "",
                productName: product?.productName || "",
              };
            }
          );
        } else {
          console.warn("No valid product IDs found, setting empty array");
          enrichedRecord.productIds = [];
        }
      } catch (error) {
        console.warn("Error fetching product details:", error);
        enrichedRecord.productIds = [];
      }
    } else {
      enrichedRecord.productIds = [];
    }

    if (populate) {
      await populateRelatedData(enrichedRecord, companyId, locationId);
    }

    return NextResponse.json({
      success: true,
      data: enrichedRecord,
    });
  } catch (error) {
    console.error("Error fetching MFC record:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update single MFC record (updated to handle new fields)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const locationId = searchParams.get("locationId");

    if (!companyId || !locationId) {
      return NextResponse.json(
        { error: "Company ID and Location ID are required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateSingleMfcSchema.parse(body);

    // Only validate product IDs if they are provided
    if (validatedData.productIds && validatedData.productIds.length > 0) {
      validatedData.productIds = validatedData.productIds
        .map((productId: any) => safeProductIdToString(productId))
        .filter((id): id is string => id !== null);

      if (validatedData.productIds.length === 0) {
        return NextResponse.json(
          { error: "No valid product IDs provided" },
          { status: 400 }
        );
      }

      const productValidation = await validateProductIds(
        validatedData.productIds,
        companyId,
        locationId
      );

      if (!productValidation.valid) {
        return NextResponse.json(
          {
            error: "Invalid product IDs",
            invalidIds: productValidation.invalidIds,
          },
          { status: 400 }
        );
      }
    }

    const oldMFC = await MFCMaster.findOne({
      _id: id,
      companyId,
      locationId,
    });

    if (!oldMFC) {
      return NextResponse.json(
        { error: "MFC record not found or access denied" },
        { status: 404 }
      );
    }

    if (validatedData.mfcNumber) {
      const existingMFC = await MFCMaster.findOne({
        _id: { $ne: id },
        mfcNumber: validatedData.mfcNumber,
        companyId,
        locationId,
      });

      if (existingMFC) {
        return NextResponse.json(
          { error: "MFC number already exists" },
          { status: 409 }
        );
      }
    }

    const updatedRecord = await MFCMaster.findOneAndUpdate(
      {
        _id: id,
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
        { error: "MFC record not found" },
        { status: 404 }
      );
    }

    // Sync with Product Master - handle empty arrays
    const oldProductIds =
      oldMFC.productIds
        ?.map((id: any) => safeProductIdToString(id))
        .filter((id: any): id is string => id !== null) || [];
    const newProductIds = validatedData.productIds || [];

    await syncMFCProductRelationship(
      id,
      newProductIds,
      oldProductIds,
      companyId,
      locationId
    );

    // Type check before calling toObject()
    const oldMFCData =
      oldMFC && typeof oldMFC.toObject === "function"
        ? oldMFC.toObject()
        : oldMFC;
    const updatedRecordData =
      updatedRecord && typeof updatedRecord.toObject === "function"
        ? updatedRecord.toObject()
        : updatedRecord;

    await createMFCAuditLog({
      mfcId: updatedRecord._id.toString(),
      mfcNumber: updatedRecord.mfcNumber,
      companyId: updatedRecord.companyId,
      locationId: updatedRecord.locationId,
      action: "UPDATE",
      performedBy: validatedData.updatedBy || "system",
      oldData: oldMFCData,
      newData: updatedRecordData,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    const successMessage = newProductIds.length
      ? `MFC record updated successfully and synced with ${newProductIds.length} Product record(s)`
      : "MFC record updated successfully without product associations";

    return NextResponse.json({
      success: true,
      message: successMessage,
      data: updatedRecord,
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
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete single MFC record (unchanged functionality)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const locationId = searchParams.get("locationId");
    const deletedBy = searchParams.get("deletedBy");

    if (!companyId || !locationId) {
      return NextResponse.json(
        { error: "Company ID and Location ID are required" },
        { status: 400 }
      );
    }

    const mfcToDelete = await MFCMaster.findOne({
      _id: id,
      companyId,
      locationId,
    });

    if (!mfcToDelete) {
      return NextResponse.json(
        { error: "MFC record not found or access denied" },
        { status: 404 }
      );
    }

    // Remove MFC from associated products before deleting
    if (mfcToDelete.productIds && mfcToDelete.productIds.length > 0) {
      const productIds = mfcToDelete.productIds
        .map((id: any) => safeProductIdToString(id))
        .filter((id: any): id is string => id !== null);

      if (productIds.length > 0) {
        await Product.updateMany(
          {
            _id: { $in: productIds },
            companyId,
            locationId,
          },
          {
            $pull: { mfcs: id },
          }
        );
      }
    }

    const deletedRecord = await MFCMaster.findOneAndDelete({
      _id: id,
      companyId,
      locationId,
    });

    if (!deletedRecord) {
      return NextResponse.json(
        { error: "MFC record not found" },
        { status: 404 }
      );
    }

    // Type check before calling toObject()
    const mfcToDeleteData =
      mfcToDelete && typeof mfcToDelete.toObject === "function"
        ? mfcToDelete.toObject()
        : mfcToDelete;

    await createMFCAuditLog({
      mfcId: deletedRecord._id.toString(),
      mfcNumber: deletedRecord.mfcNumber,
      companyId: deletedRecord.companyId,
      locationId: deletedRecord.locationId,
      action: "DELETE",
      performedBy: deletedBy || "system",
      oldData: mfcToDeleteData,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({
      success: true,
      message:
        "MFC record deleted successfully and removed from Product records",
    });
  } catch (error) {
    console.error("Error deleting MFC record:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
