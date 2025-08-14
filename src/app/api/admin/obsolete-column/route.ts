import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import ObsoleteColumn from "@/models/obsoleteColumn";
import Audit from "@/models/columnAudit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface ChangeLog {
  field: string;
  from: any;
  to: any;
}

export async function GET(req: NextRequest) {
  console.log("=== GET /api/admin/obsolete-column START ===");

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

    console.log("Query params - companyId:", companyId, "locationId:", locationId);

    if (!companyId || !locationId) {
      console.log("Missing required query params");
      return NextResponse.json(
        { success: false, error: "Company ID and Location ID are required" },
        { status: 400 }
      );
    }

    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Database connected successfully");

    const obsoleteColumns = await ObsoleteColumn.find({ companyId, locationId })
      .populate('descriptions.makeId', 'make description')
      .populate('descriptions.prefixId', 'name')
      .populate('descriptions.suffixId', 'name')
      .sort({
        columnCode: 1,
      });

    console.log("Obsolete columns fetched:", obsoleteColumns.length);
    console.log("=== GET /api/admin/obsolete-column SUCCESS ===");
    return NextResponse.json({ success: true, data: obsoleteColumns });
  } catch (error: any) {
    console.error("=== GET /api/admin/obsolete-column ERROR ===");
    console.error("Error details:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  console.log("=== POST /api/admin/obsolete-column START ===");

  let body;
  let formattedDescriptions: any[] = []; // Declare formattedDescriptions here
  const companyId = req.nextUrl.searchParams.get("companyId");
  const locationId = req.nextUrl.searchParams.get("locationId");

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      console.log("Authentication failed - no session");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    body = await req.json();

    console.log("Request params - companyId:", companyId, "locationId:", locationId);
    console.log("Request body:", JSON.stringify(body, null, 2));

    if (!companyId || !locationId || !body.columnCode || !body.descriptions) {
      console.log("Missing required parameters or body fields");
      return NextResponse.json(
        {
          success: false,
          error: "Company ID, Location ID, column code, and descriptions are required",
        },
        { status: 400 }
      );
    }

    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Database connected successfully");

    // Validate descriptions
    formattedDescriptions = body.descriptions.map((desc: any, index: number) => {
      console.log(`Processing description ${index}:`, JSON.stringify(desc, null, 2));
      return {
        prefixId: desc.prefixId || null,
        carbonType: desc.carbonType?.trim() || "",
        linkedCarbonType: desc.linkedCarbonType?.trim() || "",
        innerDiameter: desc.innerDiameter === "" || desc.innerDiameter == null ? 0 : Number(desc.innerDiameter),
        length: desc.length === "" || desc.length == null ? 0 : Number(desc.length),
        particleSize: desc.particleSize === "" || desc.particleSize == null ? 0 : Number(desc.particleSize),
        suffixId: desc.suffixId || null,
        makeId: desc.makeId,
        columnId: desc.columnId?.trim() || "",
        installationDate: desc.installationDate || "",
        usePrefix: !!desc.usePrefix,
        useSuffix: !!desc.useSuffix,
        usePrefixForNewCode: !!desc.usePrefixForNewCode, // Added
        useSuffixForNewCode: !!desc.useSuffixForNewCode, // Added
        isObsolete: true,
      };
    });

    for (let i = 0; i < formattedDescriptions.length; i++) {
      const desc = formattedDescriptions[i];
      if (!desc.carbonType) {
        console.log(`Validation failed: Carbon Type missing for description ${i + 1}`);
        return NextResponse.json(
          { success: false, error: `Carbon Type is required for description ${i + 1}` },
          { status: 400 }
        );
      }
      if (!desc.makeId) {
        console.log(`Validation failed: Make missing for description ${i + 1}`);
        return NextResponse.json(
          { success: false, error: `Make is required for description ${i + 1}` },
          { status: 400 }
        );
      }
      if (!desc.columnId) {
        console.log(`Validation failed: Column ID missing for description ${i + 1}`);
        return NextResponse.json(
          {
            success: false,
            error: `Column ID is required for description ${i + 1}. Please select a series to generate a Column ID.`,
          },
          { status: 400 }
        );
      }
      if (!desc.installationDate) {
        console.log(`Validation failed: Installation Date missing for description ${i + 1}`);
        return NextResponse.json(
          { success: false, error: `Installation Date is required for description ${i + 1}` },
          { status: 400 }
        );
      }
      if (isNaN(desc.innerDiameter) || desc.innerDiameter < 0) {
        console.log(`Validation failed: Invalid inner diameter for description ${i + 1}`);
        return NextResponse.json(
          { success: false, error: `Invalid inner diameter for description ${i + 1}` },
          { status: 400 }
        );
      }
      if (isNaN(desc.length) || desc.length < 0) {
        console.log(`Validation failed: Invalid length for description ${i + 1}`);
        return NextResponse.json(
          { success: false, error: `Invalid length for description ${i + 1}` },
          { status: 400 }
        );
      }
      if (isNaN(desc.particleSize) || desc.particleSize < 0) {
        console.log(`Validation failed: Invalid particle size for description ${i + 1}`);
        return NextResponse.json(
          { success: false, error: `Invalid particle size for description ${i + 1}` },
          { status: 400 }
        );
      }
    }

    // Check if an ObsoleteColumn already exists for this columnCode
    let obsoleteColumn = await ObsoleteColumn.findOne({
      columnCode: body.columnCode,
      companyId,
      locationId,
    });

    if (obsoleteColumn) {
      // Append the new description, but avoid duplicates based on columnId
      const existingColumnIds = obsoleteColumn.descriptions.map((desc: any) => desc.columnId);
      const newDescriptions = formattedDescriptions.filter(
        (desc: any) => !existingColumnIds.includes(desc.columnId)
      );
      if (newDescriptions.length > 0) {
        console.log("Appending to existing ObsoleteColumn");
        obsoleteColumn.descriptions = [...obsoleteColumn.descriptions, ...newDescriptions];
        await obsoleteColumn.save();
      } else {
        console.log("Description already exists in ObsoleteColumn");
      }
    } else {
      // Create a new ObsoleteColumn
      console.log("Creating new ObsoleteColumn");
      obsoleteColumn = new ObsoleteColumn({
        columnCode: body.columnCode.trim(),
        descriptions: formattedDescriptions,
        companyId,
        locationId,
      });
      await obsoleteColumn.save();
    }

    console.log("Obsolete column saved successfully with ID:", obsoleteColumn._id);

    // Create audit log
    const changes: ChangeLog[] = formattedDescriptions
      .flatMap((desc: any, index: number) => [
        {
          field: `descriptions[${index}].prefix`,
          from: undefined,
          to: desc.prefix,
        },
        {
          field: `descriptions[${index}].carbonType`,
          from: undefined,
          to: desc.carbonType,
        },
        {
          field: `descriptions[${index}].linkedCarbonType`,
          from: undefined,
          to: desc.linkedCarbonType,
        },
        {
          field: `descriptions[${index}].innerDiameter`,
          from: undefined,
          to: desc.innerDiameter,
        },
        {
          field: `descriptions[${index}].length`,
          from: undefined,
          to: desc.length,
        },
        {
          field: `descriptions[${index}].particleSize`,
          from: undefined,
          to: desc.particleSize,
        },
        {
          field: `descriptions[${index}].suffix`,
          from: undefined,
          to: desc.suffix,
        },
        {
          field: `descriptions[${index}].make`,
          from: undefined,
          to: desc.make,
        },
        {
          field: `descriptions[${index}].columnId`,
          from: undefined,
          to: desc.columnId,
        },
        {
          field: `descriptions[${index}].installationDate`,
          from: undefined,
          to: desc.installationDate,
        },
        {
          field: `descriptions[${index}].usePrefix`,
          from: undefined,
          to: desc.usePrefix,
        },
        {
          field: `descriptions[${index}].useSuffix`,
          from: undefined,
          to: desc.useSuffix,
        },
        {
          field: `descriptions[${index}].usePrefixForNewCode`, // Added
          from: undefined,
          to: desc.usePrefixForNewCode,
        },
        {
          field: `descriptions[${index}].useSuffixForNewCode`, // Added
          from: undefined,
          to: desc.useSuffixForNewCode,
        },
        {
          field: `descriptions[${index}].isObsolete`,
          from: undefined,
          to: desc.isObsolete,
        },
      ])
      .filter(
        (change: ChangeLog) => change.to !== undefined && change.to !== ""
      );

    const audit = new Audit({
      action: "OBSOLETE",
      userId: session.user.userId,
      module: "column",
      companyId,
      locationId,
      columnCode: body.columnCode,
      changes,
    });
    await audit.save();
    console.log("Audit log created");

    console.log("=== POST /api/admin/obsolete-column SUCCESS ===");
    return NextResponse.json({ success: true, data: obsoleteColumn }, { status: 201 });
  } catch (error: any) {
    console.error("=== POST /api/admin/obsolete-column ERROR ===");
    console.error("Error details:", error);
    if (error.code === 11000) {
      console.log("Duplicate key error, attempting to update existing record");
      try {
        const existingColumn = await ObsoleteColumn.findOne({
          columnCode: body.columnCode,
          companyId,
          locationId,
        });
        if (existingColumn) {
          const existingColumnIds = existingColumn.descriptions.map((desc: any) => desc.columnId);
          const newDescriptions = formattedDescriptions.filter(
            (desc: any) => !existingColumnIds.includes(desc.columnId?.trim())
          );
          if (newDescriptions.length > 0) {
            existingColumn.descriptions = [...existingColumn.descriptions, ...newDescriptions];
            await existingColumn.save();
            console.log("Updated existing ObsoleteColumn with new descriptions");
            return NextResponse.json({ success: true, data: existingColumn }, { status: 200 });
          }
        }
      } catch (updateError: any) {
        console.error("Update error:", updateError);
        return NextResponse.json(
          { success: false, error: updateError.message },
          { status: 500 }
        );
      }
    }
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  console.log("=== PUT /api/admin/obsolete-column START ===");

  let body;
  let formattedDescriptions: any[] = [];
  const companyId = req.nextUrl.searchParams.get("companyId");
  const locationId = req.nextUrl.searchParams.get("locationId");

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      console.log("Authentication failed - no session");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    body = await req.json();

    console.log("PUT Request params - companyId:", companyId, "locationId:", locationId);
    console.log("PUT Request body:", JSON.stringify(body, null, 2));

    if (!companyId || !locationId || !body.id || !body.columnCode || !body.descriptions) {
      console.log("Missing required parameters or body fields");
      return NextResponse.json(
        {
          success: false,
          error: "Company ID, Location ID, column ID, column code, and descriptions are required",
        },
        { status: 400 }
      );
    }

    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Database connected successfully");

    // Format descriptions
    formattedDescriptions = body.descriptions.map((desc: any, index: number) => {
      console.log(`Processing description ${index}:`, JSON.stringify(desc, null, 2));
      return {
        prefixId: desc.prefixId || null,
        carbonType: desc.carbonType?.trim() || "",
        linkedCarbonType: desc.linkedCarbonType?.trim() || "",
        innerDiameter: desc.innerDiameter === "" || desc.innerDiameter == null ? 0 : Number(desc.innerDiameter),
        length: desc.length === "" || desc.length == null ? 0 : Number(desc.length),
        particleSize: desc.particleSize === "" || desc.particleSize == null ? 0 : Number(desc.particleSize),
        suffixId: desc.suffixId || null,
        makeId: desc.makeId,
        columnId: desc.columnId?.trim() || "",
        installationDate: desc.installationDate || "",
        usePrefix: !!desc.usePrefix,
        useSuffix: !!desc.useSuffix,
        usePrefixForNewCode: !!desc.usePrefixForNewCode,
        useSuffixForNewCode: !!desc.useSuffixForNewCode,
        isObsolete: true,
      };
    });

    console.log("=== PUT FORMATTED DESCRIPTIONS ===");
    console.log("Full formatted descriptions:", JSON.stringify(formattedDescriptions, null, 2));
    console.log("usePrefixForNewCode values:", formattedDescriptions.map(d => d.usePrefixForNewCode));
    console.log("useSuffixForNewCode values:", formattedDescriptions.map(d => d.useSuffixForNewCode));

    // Validate descriptions
    for (let i = 0; i < formattedDescriptions.length; i++) {
      const desc = formattedDescriptions[i];
      if (!desc.carbonType) {
        return NextResponse.json(
          { success: false, error: `Carbon Type is required for description ${i + 1}` },
          { status: 400 }
        );
      }
      if (!desc.makeId) {
        return NextResponse.json(
          { success: false, error: `Make is required for description ${i + 1}` },
          { status: 400 }
        );
      }
      if (!desc.columnId) {
        return NextResponse.json(
          { success: false, error: `Column ID is required for description ${i + 1}` },
          { status: 400 }
        );
      }
      if (!desc.installationDate) {
        return NextResponse.json(
          { success: false, error: `Installation Date is required for description ${i + 1}` },
          { status: 400 }
        );
      }
    }

    // Find and update the obsolete column
    const updatedColumn = await ObsoleteColumn.findByIdAndUpdate(
      body.id,
      {
        columnCode: body.columnCode.trim(),
        descriptions: formattedDescriptions,
        companyId,
        locationId,
      },
      { new: true, runValidators: true }
    );

    if (!updatedColumn) {
      console.log("Obsolete column not found for update");
      return NextResponse.json(
        { success: false, error: "Obsolete column not found" },
        { status: 404 }
      );
    }

    console.log("Obsolete column updated successfully with ID:", updatedColumn._id);
    console.log("Updated descriptions:", JSON.stringify(updatedColumn.descriptions, null, 2));

    // Create audit log
    const changes = formattedDescriptions.flatMap((desc: any, index: number) => [
      {
        field: `descriptions[${index}].carbonType`,
        from: undefined, // Could track previous values if needed
        to: desc.carbonType,
      },
      {
        field: `descriptions[${index}].makeId`,
        from: undefined,
        to: desc.makeId,
      },
      {
        field: `descriptions[${index}].columnId`,
        from: undefined,
        to: desc.columnId,
      },
      {
        field: `descriptions[${index}].installationDate`,
        from: undefined,
        to: desc.installationDate,
      },
      {
        field: `descriptions[${index}].usePrefixForNewCode`,
        from: undefined,
        to: desc.usePrefixForNewCode,
      },
      {
        field: `descriptions[${index}].useSuffixForNewCode`, 
        from: undefined,
        to: desc.useSuffixForNewCode,
      },
      {
        field: `descriptions[${index}].isObsolete`,
        from: undefined,
        to: desc.isObsolete,
      },
    ]);

    const audit = new Audit({
      action: "update",
      userId: session.user.userId,
      module: "obsolete_column",
      companyId,
      locationId,
      columnCode: body.columnCode,
      changes,
    });
    await audit.save();
    console.log("Audit log created");

    console.log("=== PUT /api/admin/obsolete-column SUCCESS ===");
    return NextResponse.json({ success: true, data: updatedColumn }, { status: 200 });

  } catch (error: any) {
    console.error("=== PUT /api/admin/obsolete-column ERROR ===");
    console.error("Error details:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}