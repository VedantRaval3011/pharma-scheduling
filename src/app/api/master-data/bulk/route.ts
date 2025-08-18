import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Import your models
import Api from "@/models/apiMaster";
import Department from "@/models/department";
import TestType from "@/models/test-type";
import DetectorType from "@/models/detectorType";
import Pharmacopoeial from "@/models/pharmacopeial";
import Column from "@/models/column"; // ✅ Add this import if you have a Column model

export async function GET(request: NextRequest) {
  try {
    console.log('Bulk API called'); // Debug log
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log('Unauthorized request'); // Debug log
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get company and location from query params
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const locationId = searchParams.get("locationId");

    console.log('Request params:', { companyId, locationId }); // Debug log

    if (!companyId || !locationId) {
      return NextResponse.json(
        { success: false, error: "Company ID and Location ID are required" },
        { status: 400 }
      );
    }

    await connectDB();
    console.log('Connected to DB'); // Debug log

    // Filter criteria for all collections
    const filter = { companyId, locationId };
    console.log('Using filter:', filter); // Debug log

    // Fetch all master data in parallel
    // ✅ Add Column.find() if you have a Column model, otherwise remove it from context
    const [apis, departments, testTypes, detectorTypes, pharmacopoeials, columns] =
      await Promise.all([
        Api.find(filter).sort({ api: 1 }).lean(),
        Department.find(filter).sort({ department: 1 }).lean(),
        TestType.find(filter).sort({ testType: 1 }).lean(),
        DetectorType.find(filter).sort({ detectorType: 1 }).lean(),
        Pharmacopoeial.find(filter).sort({ pharmacopoeial: 1 }).lean(),
        Column.find(filter).sort({ columnCode: 1 }).lean(),
        Promise.resolve([]), // Temporary empty array for columns
      ]);

    console.log('Fetched data counts:', {
      apis: apis.length,
      departments: departments.length,
      testTypes: testTypes.length,
      detectorTypes: detectorTypes.length,
      pharmacopoeials: pharmacopoeials.length,
      columns: columns.length,
    }); // Debug log

    const responseData = {
      success: true,
      data: {
        apis,
        departments,
        testTypes,
        detectorTypes,
        pharmacopoeials,
        columns,
      },
      meta: {
        companyId,
        locationId,
        timestamp: new Date().toISOString(),
        counts: {
          apis: apis.length,
          departments: departments.length,
          testTypes: testTypes.length,
          detectorTypes: detectorTypes.length,
          pharmacopoeials: pharmacopoeials.length,
          columns: columns.length,
        },
      },
    };

    console.log('Returning response'); // Debug log
    return NextResponse.json(responseData); 
    
  } catch (error: any) {
    console.error("Bulk master data fetch error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}