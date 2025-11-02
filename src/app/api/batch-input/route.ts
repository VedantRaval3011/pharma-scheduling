import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import BatchInput from "@/models/batch/BatchInput";
import MFCMaster, { ITestType } from "@/models/MFCMaster";

// ✅ CREATE Batch
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    console.log("Received request body:", JSON.stringify(body, null, 2));

    const {
      companyId,
      locationId,
      mfcId,
      typeOfSample,
      productCode,
      productName,
      genericName,
      batchNumber,
      manufacturingDate,

      // Additional batch fields
      withdrawalDate,
      priority,
      batchStatus,
      pharmacopeiaToUse,
      pharmacopoeialName,
      departmentName,
      daysForUrgency,
      wash,
      isObsolete,
      isRawMaterial,

      // Audit
      createdBy,
      startedAt,
      endedAt,

      // Product hierarchy
      generics,

      // Flat tests
      tests,
    } = body;

    // Validation
    if (!companyId || !locationId || !mfcId || !typeOfSample) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields",
          missing: {
            companyId: !companyId,
            locationId: !locationId,
            mfcId: !mfcId,
            typeOfSample: !typeOfSample,
          },
        },
        { status: 400 }
      );
    }

    if (!productCode || !productName || !batchNumber) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required batch fields",
          missing: {
            productCode: !productCode,
            productName: !productName,
            batchNumber: !batchNumber,
          },
        },
        { status: 400 }
      );
    }

    // Validate MFC exists and get department info
    const mfc = await MFCMaster.findById(mfcId);
    if (!mfc) {
      return NextResponse.json(
        { success: false, message: "MFC not found" },
        { status: 404 }
      );
    }

    // Check for duplicate batch number
    const existingBatch = await BatchInput.findOne({
      batchNumber,
      companyId,
      locationId,
    });

    if (existingBatch) {
      return NextResponse.json(
        {
          success: false,
          message: "Batch number already exists for this product",
        },
        { status: 409 }
      );
    }

    // ✅ Process tests with ALL schema fields
    const processedTests = (tests || []).map((test: any) => {
      // FIX: Handle pharmacopoeialId properly
      let pharmacopoeialId = [];
      if (Array.isArray(test.pharmacopoeialId)) {
        pharmacopoeialId = test.pharmacopoeialId.filter(
          (id: string) => id && id.trim() !== ""
        );
      } else if (test.pharmacopoeialId && test.pharmacopoeialId.trim() !== "") {
        pharmacopoeialId = [test.pharmacopoeialId.trim()];
      }

      return {
        testTypeId: test.testTypeId,
        testName: test.testName,
        columnCode: test.columnCode,
        isColumnCodeLinkedToMfc: Boolean(test.isColumnCodeLinkedToMfc),
        selectMakeSpecific: Boolean(test.selectMakeSpecific),
        mobilePhaseCodes: test.mobilePhaseCodes || ["", "", "", "", "", ""],
        detectorTypeId: test.detectorTypeId,
        pharmacopoeialId: pharmacopoeialId, // Use the processed array

        // Injection counts
        sampleInjection: Number(test.sampleInjection) || 0,
        standardInjection: Number(test.standardInjection) || 0,
        blankInjection: Number(test.blankInjection) || 0,
        systemSuitability: Number(test.systemSuitability) || 0,
        sensitivity: Number(test.sensitivity) || 0,
        placebo: Number(test.placebo) || 0,
        reference1: Number(test.reference1) || 0,
        reference2: Number(test.reference2) || 0,
        bracketingFrequency: Number(test.bracketingFrequency) || 0,

        // Runtimes
        injectionTime: Number(test.injectionTime) || 0,
        runTime: Number(test.runTime) || 0,
        uniqueRuntimes: Boolean(test.uniqueRuntimes),

        blankRunTime: Number(test.blankRunTime) || 0,
        standardRunTime: Number(test.standardRunTime) || 0,
        sampleRunTime: Number(test.sampleRunTime) || 0,
        systemSuitabilityRunTime: Number(test.systemSuitabilityRunTime) || 0,
        sensitivityRunTime: Number(test.sensitivityRunTime) || 0,
        placeboRunTime: Number(test.placeboRunTime) || 0,
        reference1RunTime: Number(test.reference1RunTime) || 0,
        reference2RunTime: Number(test.reference2RunTime) || 0,
        washTime: Number(test.washTime) || 0,

        // Applicability
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
        outsourced: Boolean(test.outsourced) || Boolean(test.isOutsourcedTest),
        continueTests: test.continueTests !== false, // default true
        testStatus: test.testStatus || "Not Started",
        startedAt: test.startedAt ? new Date(test.startedAt) : undefined,
        endedAt: test.endedAt ? new Date(test.endedAt) : undefined,

        // Results
        results: {
          actualResult: test.results?.actualResult,
          expectedResult: test.results?.expectedResult,
          passed: test.results?.passed,
          remarks: test.results?.remarks,
        },
      };
    });

const processedGenerics = (generics || []).map((generic: any) => ({
  genericName: generic.genericName,
  apis: (generic.apis || []).map((api: any) => ({
    apiName: api.apiName,
    testStatus: api.testStatus || "Not Started", // ✅ Add this
    startedAt: api.startedAt ? new Date(api.startedAt) : undefined,
    endedAt: api.endedAt ? new Date(api.endedAt) : undefined,
    testTypes: (api.testTypes || []).map((test: any) => ({
      ...processedTests.find(
        (t: ITestType) => t.testTypeId === test.testTypeId
      ),
    })),
  })),
  }));

    // ✅ Full batch data
    const batchData = {
      companyId,
      locationId,
      mfcId,

      batchNumber,
      manufacturingDate:
        manufacturingDate && manufacturingDate.trim() !== ""
          ? new Date(manufacturingDate)
          : undefined,
      withdrawalDate:
        withdrawalDate && withdrawalDate.trim() !== ""
          ? new Date(withdrawalDate)
          : undefined,
      priority: priority || "Normal",
      batchStatus: batchStatus || "Not Started",
      typeOfSample,

      productCode,
      productName,
      genericName,
      pharmacopeiaToUse,
      pharmacopoeialName,

      mfcNumber: mfc.mfcNumber,
      departmentId: mfc.departmentId,
      departmentName,
      daysForUrgency: daysForUrgency || 0,
      wash: wash || 0,
      isObsolete: Boolean(isObsolete),
      isRawMaterial: Boolean(isRawMaterial),

      generics: processedGenerics,
      tests: processedTests,

      createdBy: createdBy || "system",
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: startedAt ? new Date(startedAt) : undefined,
      endedAt: endedAt ? new Date(endedAt) : undefined,
    };

    console.log(
      "Creating batch with full schema:",
      JSON.stringify(batchData, null, 2)
    );

    const batch = new BatchInput(batchData);
    await batch.save();

    return NextResponse.json({ success: true, data: batch }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating batch:", err);
    return NextResponse.json(
      {
        success: false,
        message: err.message,
        error: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// ✅ READ (Get all batches for company + location)
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");
    const locationId = searchParams.get("locationId");

    if (!companyId || !locationId) {
      return NextResponse.json(
        { success: false, message: "companyId and locationId are required" },
        { status: 400 }
      );
    }

    const batches = await BatchInput.find({ companyId, locationId }).sort({
      createdAt: -1,
    }); // Sort by newest first

    return NextResponse.json({ success: true, data: batches });
  } catch (err: any) {
    console.error("Error fetching batches:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
