// api/batch-input/[id]/route.ts - Simplified single-product version
import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import BatchInput from "@/models/batch/BatchInput";
import MFCMaster from "@/models/MFCMaster";

// Define the test interface with all runtime fields
interface TestData {
  testTypeId: string;
  testName: string;
  columnCode: string;
  mobilePhaseCodes: string[];
  detectorTypeId: string;
  pharmacopoeialId: string[]; // keep as array

  // Injection counts
  blankInjection: number;
  standardInjection: number;
  sampleInjection: number;
  systemSuitability: number;
  sensitivity: number;
  placebo: number;
  reference1: number;
  reference2: number;
  bracketingFrequency: number;

  // Original runtime values
  runTime: number;
  washTime: number;

  // Individual runtime values for each test parameter
  blankRunTime: number;
  standardRunTime: number;
  sampleRunTime: number;
  systemSuitabilityRunTime: number;
  sensitivityRunTime: number;
  placeboRunTime: number;
  reference1RunTime: number;
  reference2RunTime: number;

  // New flags / properties from MFC
  selectMakeSpecific: boolean;
  isColumnCodeLinkedToMfc: boolean;
  uniqueRuntimes: boolean;
  testApplicability: boolean;
  numberOfInjections: number;
  numberOfInjectionsAMV: number;
  numberOfInjectionsPV: number;
  numberOfInjectionsCV: number;
  bulk: boolean;
  fp: boolean;
  stabilityPartial: boolean;
  stabilityFinal: boolean;
  amv: boolean;
  pv: boolean;
  cv: boolean;
  isLinked: boolean;
  priority: "urgent" | "high" | "normal";
  isOutsourcedTest: boolean;

  outsourced: boolean; // alias to keep backward compat
  continueTests: boolean;

  // Runtime state
  testStatus?: "Not Started" | "In Progress" | "Closed";
  startedAt?: Date;
  endedAt?: Date;

  // Results
  results?: {
    actualResult?: number;
    expectedResult?: number;
    passed?: boolean;
    remarks?: string;
  };
}

interface UpdateBatchRequest {
  // Batch-level fields
  productCode?: string;
  productName?: string;
  genericName?: string;
  batchNumber?: string;
  manufacturingDate?: string;
  withdrawalDate?: string;
  priority?: "Urgent" | "High" | "Normal";
  typeOfSample?: string;
  departmentName?: string;
  daysForUrgency?: number;
  pharmacopeiaToUse?: string;
  pharmacopoeialName?: string;
  batchStatus?: "Not Started" | "In Progress" | "Closed";
  mfcId?: string;
  wash?: number;
  isObsolete?: boolean;
  isRawMaterial?: boolean;
  startedAt?: string;
  endedAt?: string;

  // Product hierarchy
  generics?: {
    genericName: string;
    apis: {
      apiName: string;
      testTypes: TestData[];
    }[];
  }[];

  // Flat tests
  tests?: TestData[];

  // Test status update
  testId?: string;
  status?: string;
  testStatus?: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

interface BatchDetailResponse extends ApiResponse {
  data?: any;
}

// Normalize generics with nested tests
const normalizeGenerics = (generics: any[]) => {
  return (generics || []).map((generic) => ({
    genericName: generic.genericName,
    apis: (generic.apis || []).map((api: any) => ({
      apiName: api.apiName,
      testTypes: (api.testTypes || []).map((test: any) =>
        normalizeTestData(test)
      ),
    })),
  }));
};

// Helper function to normalize test data with all runtime fields
const normalizeTestData = (test: any): TestData => {
  return {
    testTypeId: test.testTypeId || "",
    testName: test.testName || "",
    columnCode: test.columnCode || "",
    mobilePhaseCodes: Array.isArray(test.mobilePhaseCodes)
      ? test.mobilePhaseCodes
      : [],
    detectorTypeId: test.detectorTypeId || "",
    // FIX: Handle pharmacopoeialId properly
    pharmacopoeialId: Array.isArray(test.pharmacopoeialId)
      ? test.pharmacopoeialId.filter((id: string) => id && id.trim() !== "") // Remove empty strings
      : test.pharmacopoeialId && test.pharmacopoeialId.trim() !== ""
      ? [test.pharmacopoeialId.trim()] // Convert single string to array
      : [""], // Provide default non-empty string in array

    // Injection counts
    blankInjection: Number(test.blankInjection) || 0,
    standardInjection: Number(test.standardInjection) || 0,
    sampleInjection: Number(test.sampleInjection) || 0,
    systemSuitability: Number(test.systemSuitability) || 0,
    sensitivity: Number(test.sensitivity) || 0,
    placebo: Number(test.placebo) || 0,
    reference1: Number(test.reference1) || 0,
    reference2: Number(test.reference2) || 0,
    bracketingFrequency: Number(test.bracketingFrequency) || 0,

    // Original runtime values
    runTime: Number(test.runTime) || 0,
    washTime: Number(test.washTime) || 0,

    // Individual runtime values
    blankRunTime: Number(test.blankRunTime) || 0,
    standardRunTime: Number(test.standardRunTime) || 0,
    sampleRunTime: Number(test.sampleRunTime) || 0,
    systemSuitabilityRunTime: Number(test.systemSuitabilityRunTime) || 0,
    sensitivityRunTime: Number(test.sensitivityRunTime) || 0,
    placeboRunTime: Number(test.placeboRunTime) || 0,
    reference1RunTime: Number(test.reference1RunTime) || 0,
    reference2RunTime: Number(test.reference2RunTime) || 0,

    // Flags from MFC
    selectMakeSpecific: Boolean(test.selectMakeSpecific),
    isColumnCodeLinkedToMfc: Boolean(test.isColumnCodeLinkedToMfc),
    uniqueRuntimes: Boolean(test.uniqueRuntimes),
    testApplicability: Boolean(test.testApplicability),
    numberOfInjections: Number(test.numberOfInjections) || 0,
    numberOfInjectionsAMV: Number(test.numberOfInjectionsAMV) || 0,
    numberOfInjectionsPV: Number(test.numberOfInjectionsPV) || 0,
    numberOfInjectionsCV: Number(test.numberOfInjectionsCV) || 0,
    bulk: Boolean(test.bulk),
    fp: Boolean(test.fp),
    stabilityPartial: Boolean(test.stabilityPartial),
    stabilityFinal: Boolean(test.stabilityFinal),
    amv: Boolean(test.amv),
    pv: Boolean(test.pv),
    cv: Boolean(test.cv),
    isLinked: Boolean(test.isLinked),
    priority: test.priority || "normal",
    isOutsourcedTest: Boolean(test.isOutsourcedTest),

    // Legacy aliases
    outsourced: Boolean(test.outsourced) || Boolean(test.isOutsourcedTest),
    continueTests: Boolean(test.continueTests),

    // Runtime state
    testStatus: test.testStatus || "Not Started",
    startedAt: test.startedAt ? new Date(test.startedAt) : undefined,
    endedAt: test.endedAt ? new Date(test.endedAt) : undefined,

    // Results
    results: test.results || {},
  };
};

// ✅ READ Single Batch
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<BatchDetailResponse>> {
  try {
    await connectToDatabase();

    if (!params.id) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          message: "Batch ID is required",
        },
        { status: 400 }
      );
    }

    const batch = await BatchInput.findById(params.id);

    if (!batch) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          message: "Batch not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json<BatchDetailResponse>({
      success: true,
      data: batch.toJSON(),
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Error fetching batch:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// ✅ UPDATE Batch - Simplified for single-product structure
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<BatchDetailResponse>> {
  try {
    await connectToDatabase();

    if (!params.id) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          message: "Batch ID is required",
        },
        { status: 400 }
      );
    }

    const body: UpdateBatchRequest = await req.json();

    // Enhanced debugging
    console.log("=== PUT REQUEST DEBUG ===");
    console.log("Request body keys:", Object.keys(body));

    if (body.tests && Array.isArray(body.tests)) {
      console.log("Tests array length:", body.tests.length);
      body.tests.forEach((test, index) => {
        console.log(`Test ${index} runtime values:`, {
          testName: test.testName,
          runTime: test.runTime,
          blankRunTime: test.blankRunTime,
          standardRunTime: test.standardRunTime,
          sampleRunTime: test.sampleRunTime,
          systemSuitabilityRunTime: test.systemSuitabilityRunTime,
          sensitivityRunTime: test.sensitivityRunTime,
          placeboRunTime: test.placeboRunTime,
          reference1RunTime: test.reference1RunTime,
          reference2RunTime: test.reference2RunTime,
        });
      });
    }

    const batch = await BatchInput.findById(params.id);

    // Handle generics with nested apis + tests
    if (body.generics && Array.isArray(body.generics)) {
      console.log("Processing generics hierarchy...");
      const processedGenerics = normalizeGenerics(body.generics);
      2;
      batch.generics = processedGenerics;
      console.log("Assigned processed generics to batch");
    }

    if (!batch) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          message: "Batch not found",
        },
        { status: 404 }
      );
    }

    console.log("Current batch found, processing update...");

    // 1. Update individual test status
    if (body.testId && (body.status || body.testStatus)) {
      const testStatus = body.status || body.testStatus;

      if (batch.tests && Array.isArray(batch.tests)) {
        const test = (batch.tests as any[]).find(
          (t: any) => t.testId === body.testId
        );
        if (!test) {
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              message: "Test not found in batch",
            },
            { status: 404 }
          );
        }

        test.testStatus = testStatus;
        if (testStatus === "In Progress") {
          test.startedAt = new Date();
        } else if (testStatus === "Closed") {
          test.endedAt = new Date();
        }

        batch.updatedAt = new Date();
        await batch.save();

        return NextResponse.json<BatchDetailResponse>({
          success: true,
          data: batch.toJSON(),
        });
      }
    }

    // 2. Update batch status only
    if (body.batchStatus && Object.keys(body).length === 1) {
      batch.batchStatus = body.batchStatus;

      if (body.batchStatus === "In Progress") {
        batch.startedAt = new Date();
      } else if (body.batchStatus === "Closed") {
        batch.endedAt = new Date();
      }

      batch.updatedAt = new Date();
      await batch.save();

      return NextResponse.json<BatchDetailResponse>({
        success: true,
        data: batch.toJSON(),
      });
    }

    // Validate required fields if it's a full update
    if (
      body.productCode !== undefined &&
      (!body.productCode ||
        !body.productName ||
        !body.batchNumber ||
        !body.typeOfSample)
    ) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          message: "Missing required fields for batch update",
        },
        { status: 400 }
      );
    }

    // Check for duplicate batch number (exclude current batch)
    if (body.batchNumber && body.batchNumber !== batch.batchNumber) {
      const existingBatch = await BatchInput.findOne({
        batchNumber: body.batchNumber,
        companyId: batch.companyId,
        locationId: batch.locationId,
        _id: { $ne: params.id },
      });

      if (existingBatch) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            message: "Batch number already exists",
          },
          { status: 409 }
        );
      }
    }

    // Handle MFC update
    if (body.mfcId && body.mfcId !== batch.mfcId) {
      const mfc = await MFCMaster.findById(body.mfcId);
      if (!mfc) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            message: "MFC not found",
          },
          { status: 404 }
        );
      }
      batch.mfcNumber = mfc.mfcNumber;
      batch.mfcId = body.mfcId;

      // Update departmentId if it's missing
      if (!batch.departmentId && mfc.departmentId) {
        batch.departmentId = mfc.departmentId;
      }
    }

    // CRITICAL: Handle tests with all runtime values
    if (body.tests && Array.isArray(body.tests)) {
      console.log("Processing tests array with runtime values...");
      console.log("Number of tests to process:", body.tests.length);

      const processedTests = body.tests.map((test: any, index: number) => {
        const normalizedTest = normalizeTestData(test);
        console.log(`Processed test ${index}:`, {
          testName: normalizedTest.testName,
          runTime: normalizedTest.runTime,
          blankRunTime: normalizedTest.blankRunTime,
          standardRunTime: normalizedTest.standardRunTime,
          sampleRunTime: normalizedTest.sampleRunTime,
          systemSuitabilityRunTime: normalizedTest.systemSuitabilityRunTime,
          sensitivityRunTime: normalizedTest.sensitivityRunTime,
          placeboRunTime: normalizedTest.placeboRunTime,
          reference1RunTime: normalizedTest.reference1RunTime,
          reference2RunTime: normalizedTest.reference2RunTime,
        });
        return normalizedTest;
      });

      batch.tests = processedTests;
      console.log("Successfully assigned processed tests to batch");
    }
    const parseOptionalDate = (value: unknown): Date | null | undefined => {
  if (value === undefined) return undefined; // don't touch existing value
  if (value === null || value === "") return null; // explicitly clear it
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? null : d; // prevent Invalid Date
};

    // Update other batch fields
    if (body.productCode !== undefined) batch.productCode = body.productCode;
    if (body.productName !== undefined) batch.productName = body.productName;
    if (body.genericName !== undefined) batch.genericName = body.genericName;
    if (body.batchNumber !== undefined) batch.batchNumber = body.batchNumber;
const mfg = parseOptionalDate(body.manufacturingDate);
if (mfg !== undefined) batch.manufacturingDate = mfg;
    if (body.priority !== undefined) batch.priority = body.priority;
    if (body.typeOfSample !== undefined) batch.typeOfSample = body.typeOfSample;
    if (body.departmentName !== undefined)
      batch.departmentName = body.departmentName;
    if (body.daysForUrgency !== undefined)
      batch.daysForUrgency = body.daysForUrgency;
    if (body.pharmacopeiaToUse !== undefined)
      batch.pharmacopeiaToUse = body.pharmacopeiaToUse;
    if (body.pharmacopoeialName !== undefined)
      batch.pharmacopoeialName = body.pharmacopoeialName;
    if (body.batchStatus !== undefined) batch.batchStatus = body.batchStatus;
    const wd = parseOptionalDate(body.withdrawalDate);
if (wd !== undefined) batch.withdrawalDate = wd;

    if (body.wash !== undefined) batch.wash = body.wash;
    if (body.isObsolete !== undefined) batch.isObsolete = body.isObsolete;
    if (body.isRawMaterial !== undefined)
      batch.isRawMaterial = body.isRawMaterial;
    if (body.startedAt !== undefined)
      batch.startedAt = new Date(body.startedAt);
    if (body.endedAt !== undefined) batch.endedAt = new Date(body.endedAt);

    // Handle required fields that might be missing
    if (!batch.createdBy) {
      batch.createdBy = "system"; // or get from session/auth context
    }

    batch.updatedAt = new Date();

    console.log("Saving batch with updated data...");
    await batch.save();
    console.log("Batch saved successfully");

    return NextResponse.json<BatchDetailResponse>({
      success: true,
      data: batch.toJSON(),
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Error updating batch:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// ✅ DELETE Batch
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<{ deletedId: string }>>> {
  try {
    await connectToDatabase();

    if (!params.id) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          message: "Batch ID is required",
        },
        { status: 400 }
      );
    }

    const deleted = await BatchInput.findByIdAndDelete(params.id);
    if (!deleted) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          message: "Batch not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<{ deletedId: string }>>({
      success: true,
      message: "Batch deleted successfully",
      data: { deletedId: params.id },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Error deleting batch:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}
