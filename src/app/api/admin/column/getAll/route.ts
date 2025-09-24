import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Column from "@/models/column";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Make from "@/models/make";
import { PrefixSuffix } from "@/models/PrefixSuffix";


const ensureModelsRegistered = () => {
  // This forces Mongoose to register the models if they haven't been already
  if (!mongoose.models.Make) {
    require("@/models/make");
  }
  if (!mongoose.models.PrefixSuffix) {
    require("@/models/PrefixSuffix");
  }
};


export async function GET(req: NextRequest) {
  console.log("=== GET /api/admin/column-description START ===");
  
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      console.log("Authentication failed - no session");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }


    const companyId = req.nextUrl.searchParams.get("companyId");
    const locationId = req.nextUrl.searchParams.get("locationId");
    const descriptionId = req.nextUrl.searchParams.get("descriptionId");


    console.log("Query params:", { companyId, locationId, descriptionId });


    if (!companyId || !locationId || !descriptionId) {
      console.log("Missing required query params");
      return NextResponse.json(
        { success: false, error: "Company ID, Location ID, and Description ID are required" },
        { status: 400 }
      );
    }


    await mongoose.connect(process.env.MONGODB_URI!);
    ensureModelsRegistered();
    console.log("Database connected successfully");


    // Find the column that contains the description with the given descriptionId
    const column = await Column.findOne({
      companyId,
      locationId,
      "descriptions.descriptionId": descriptionId
    });


    if (!column) {
      console.log("Column or description not found");
      return NextResponse.json(
        { success: false, error: "Description not found" },
        { status: 404 }
      );
    }

    console.log("Found parent column:", column.columnCode, "partNumber:", column.partNumber || 'N/A');

    // Find the specific description within the column
    const description = column.descriptions.find(
      (desc: any) => desc.descriptionId && desc.descriptionId.toString() === descriptionId
    );


    if (!description) {
      console.log("Description not found in column");
      return NextResponse.json(
        { success: false, error: "Description not found" },
        { status: 404 }
      );
    }


    console.log("Found description:", JSON.stringify(description, null, 2));


    // Collect related IDs for batch fetching
    const relatedIds = {
      makeIds: description.makeId ? [description.makeId.toString()] : [],
      prefixIds: description.prefixId ? [description.prefixId.toString()] : [],
      suffixIds: description.suffixId ? [description.suffixId.toString()] : []
    };


    console.log("Related IDs to fetch:", relatedIds);


    // Batch fetch all related data
    const [makes, prefixSuffixes] = await Promise.all([
      Make.find({ _id: { $in: relatedIds.makeIds } }).lean(),
      PrefixSuffix.find({
        _id: { $in: [...relatedIds.prefixIds, ...relatedIds.suffixIds] }
      }).lean()
    ]);


    console.log("Fetched makes:", makes);
    console.log("Fetched prefixSuffixes:", prefixSuffixes);


    // Create lookup maps for fast access
    const makeMap = new Map();
    makes.forEach((make) => {
      makeMap.set(String(make._id), make);
    });


    const prefixSuffixMap = new Map();
    prefixSuffixes.forEach((ps) => {
      prefixSuffixMap.set(String(ps._id), ps);
    });


    // Manually join related data
    const make = description.makeId ? makeMap.get(description.makeId.toString()) : null;
    const prefix = description.prefixId ? prefixSuffixMap.get(description.prefixId.toString()) : null;
    const suffix = description.suffixId ? prefixSuffixMap.get(description.suffixId.toString()) : null;


    console.log("Joined data:", { make, prefix, suffix });


    // ✅ NEW: Transform the response to include both column-level and description-level data
    const responseData = {
      // ✅ Parent column information
      column: {
        _id: column._id,
        columnCode: column.columnCode,
        partNumber: column.partNumber || '', // Include partNumber with fallback
        companyId: column.companyId,
        locationId: column.locationId,
        createdAt: column.createdAt,
        updatedAt: column.updatedAt,
      },
      // ✅ Description data (subdocument)
      description: {
        descriptionId: description.descriptionId,
        prefixId: description.prefixId ? {
          _id: description.prefixId,
          name: prefix?.name || null,
        } : null,
        carbonType: description.carbonType,
        linkedCarbonType: description.linkedCarbonType,
        innerDiameter: description.innerDiameter,
        length: description.length,
        particleSize: description.particleSize,
        suffixId: description.suffixId ? {
          _id: description.suffixId,
          name: suffix?.name || null,
        } : null,
        makeId: description.makeId ? {
          _id: description.makeId,
          make: make?.make || null,
          description: make?.description || null,
        } : null,
        columnId: description.columnId,
        installationDate: description.installationDate,
        usePrefix: description.usePrefix,
        useSuffix: description.useSuffix,
        usePrefixForNewCode: description.usePrefixForNewCode,
        useSuffixForNewCode: description.useSuffixForNewCode,
        isObsolete: description.isObsolete,
        // NEW optional fields - pH range with proper null handling
        description: description.description || null,
        phMin: description.phMin !== undefined ? description.phMin : null,
        phMax: description.phMax !== undefined ? description.phMax : null,
      }
    };


    console.log("Final response data:", JSON.stringify(responseData, null, 2));
    console.log("=== GET /api/admin/column-description SUCCESS ===");


    return NextResponse.json({ 
      success: true, 
      data: responseData,
      message: `Description retrieved successfully from column ${column.columnCode}${column.partNumber ? ` (${column.partNumber})` : ''}` // ✅ Include partNumber in success message
    });
  } catch (error: any) {
    console.error("=== GET /api/admin/column-description ERROR ===");
    console.error("Error details:", error);
    console.error("Error stack:", error.stack);
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}