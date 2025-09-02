import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Column from "@/models/column";
import Audit from "@/models/columnAudit";
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

interface ChangeLog {
  field: string;
  from: any;
  to: any;
}

interface IDescription {
  descriptionId: mongoose.Types.ObjectId;
  prefixId?: mongoose.Types.ObjectId | null;
  carbonType: string;
  linkedCarbonType: string;
  innerDiameter: number;
  length: number;
  particleSize: number;
  suffixId?: mongoose.Types.ObjectId | null;
  makeId: mongoose.Types.ObjectId;
  columnId: string;
  installationDate: string;
  usePrefix: boolean;
  useSuffix: boolean;
  usePrefixForNewCode: boolean;
  useSuffixForNewCode: boolean;
  isObsolete: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const companyId = req.nextUrl.searchParams.get("companyId");
    const locationId = req.nextUrl.searchParams.get("locationId");
    const descriptionId = req.nextUrl.searchParams.get("descriptionId");

    if (!companyId || !locationId) {
      return NextResponse.json(
        { success: false, error: "Company ID and Location ID are required" },
        { status: 400 }
      );
    }

    await mongoose.connect(process.env.MONGODB_URI!);

    // If descriptionId is provided, fetch specific description
    if (descriptionId) {
      console.log("Fetching specific description with ID:", descriptionId);
      
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

      // Collect related IDs for batch fetching
      const relatedIds = {
        makeIds: description.makeId ? [description.makeId.toString()] : [],
        prefixIds: description.prefixId ? [description.prefixId.toString()] : [],
        suffixIds: description.suffixId ? [description.suffixId.toString()] : []
      };

      // Batch fetch all related data
      const [makes, prefixSuffixes] = await Promise.all([
        Make.find({ _id: { $in: relatedIds.makeIds } }).lean(),
        PrefixSuffix.find({
          _id: { $in: [...relatedIds.prefixIds, ...relatedIds.suffixIds] }
        }).lean()
      ]);

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

      // Transform the description with joined data
      const transformedDescription = {
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
      };

      return NextResponse.json({ success: true, data: transformedDescription });
    }

    // Original logic for fetching all columns (when no descriptionId is provided)
    // Fetch columns without population
    const columns = await Column.find({ companyId, locationId }).sort({
      columnCode: 1,
    });

    // Collect all unique IDs for batch fetching
    const makeIds = new Set<string>();
    const prefixIds = new Set<string>();
    const suffixIds = new Set<string>();

    columns.forEach((column) => {
      column.descriptions.forEach((desc: any) => {
        if (desc.makeId) makeIds.add(desc.makeId.toString());
        if (desc.prefixId) prefixIds.add(desc.prefixId.toString());
        if (desc.suffixId) suffixIds.add(desc.suffixId.toString());
      });
    });

    // Batch fetch all related data
    const [makes, prefixSuffixes] = await Promise.all([
      Make.find({ _id: { $in: Array.from(makeIds) } }).lean(),
      PrefixSuffix.find({
        _id: { $in: [...Array.from(prefixIds), ...Array.from(suffixIds)] },
      }).lean(),
    ]);

    // Create lookup maps for fast access
    // Alternative approach with better typing
    const makeMap = new Map();
    makes.forEach((make) => {
      makeMap.set(String(make._id), make);
    });

    const prefixSuffixMap = new Map();
    prefixSuffixes.forEach((ps) => {
      prefixSuffixMap.set(String(ps._id), ps);
    });

    // Process columns and manually join data
    const updatedColumns = await Promise.all(
      columns.map(async (column) => {
        let needsUpdate = false;
        const updatedDescriptions = column.descriptions.map((desc: any) => {
          if (!desc.descriptionId) {
            desc.descriptionId = new mongoose.Types.ObjectId();
            needsUpdate = true;
            console.log(
              `Generated new descriptionId for column ${column.columnCode}:`,
              desc.descriptionId
            );
          }
          return desc;
        });

        if (needsUpdate) {
          column.descriptions = updatedDescriptions;
          column.markModified("descriptions");
          await column.save();
          console.log(
            `Updated column ${column.columnCode} with missing descriptionIds`
          );
        }

        return column;
      })
    );

    // Transform the response with manually joined data
    const transformedColumns = updatedColumns.map((column) => {
      const columnObj = column.toObject();

      // Transform descriptions with manual data joining
      columnObj.descriptions = columnObj.descriptions.map((desc: any) => {
        // Generate descriptionId if missing
        if (!desc.descriptionId) {
          desc.descriptionId = new mongoose.Types.ObjectId();
          console.log(`Force generating descriptionId: ${desc.descriptionId}`);
        }

        // Manually join related data
        const make = desc.makeId ? makeMap.get(desc.makeId.toString()) : null;
        const prefix = desc.prefixId
          ? prefixSuffixMap.get(desc.prefixId.toString())
          : null;
        const suffix = desc.suffixId
          ? prefixSuffixMap.get(desc.suffixId.toString())
          : null;

        return {
          descriptionId: desc.descriptionId,
          prefixId: desc.prefixId
            ? {
                _id: desc.prefixId,
                name: prefix?.name || null,
              }
            : null,
          carbonType: desc.carbonType,
          linkedCarbonType: desc.linkedCarbonType,
          innerDiameter: desc.innerDiameter,
          length: desc.length,
          particleSize: desc.particleSize,
          suffixId: desc.suffixId
            ? {
                _id: desc.suffixId,
                name: suffix?.name || null,
              }
            : null,
          makeId: desc.makeId
            ? {
                _id: desc.makeId,
                make: make?.make || null,
                description: make?.description || null,
              }
            : null,
          columnId: desc.columnId,
          installationDate: desc.installationDate,
          usePrefix: desc.usePrefix,
          useSuffix: desc.useSuffix,
          usePrefixForNewCode: desc.usePrefixForNewCode,
          useSuffixForNewCode: desc.useSuffixForNewCode,
          isObsolete: desc.isObsolete,
        };
      });

      return columnObj;
    });

    return NextResponse.json({ success: true, data: transformedColumns });
  } catch (error: any) {
    console.error("GET /api/admin/column error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  console.log("=== POST /api/admin/column START ===");

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      console.log("Authentication failed - no session");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    console.log("Authentication successful - User:", session.user.userId);

    const companyId = req.nextUrl.searchParams.get("companyId");
    const locationId = req.nextUrl.searchParams.get("locationId");
    console.log(
      "Query params - companyId:",
      companyId,
      "locationId:",
      locationId
    );

    if (!companyId || !locationId) {
      console.log("Missing required query params");
      return NextResponse.json(
        { success: false, error: "Company ID and Location ID are required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    console.log("Request body received:", JSON.stringify(body, null, 2));

    if (
      !body.columnCode ||
      !body.descriptions ||
      !Array.isArray(body.descriptions)
    ) {
      console.log("Invalid request body structure");
      return NextResponse.json(
        {
          success: false,
          error: "Column code and descriptions are required",
        },
        { status: 400 }
      );
    }

    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Database connected successfully");

    const formattedBody = {
      columnCode: body.columnCode.trim(),
      descriptions: body.descriptions.map((desc: any, index: number) => {
        console.log(
          `Processing description ${index}:`,
          JSON.stringify(desc, null, 2)
        );
        return {
          descriptionId: desc.descriptionId || new mongoose.Types.ObjectId(), // Add descriptionId
          prefixId: desc.prefixId || null,
          carbonType: desc.carbonType?.trim() || "",
          linkedCarbonType: desc.linkedCarbonType?.trim() || "",
          innerDiameter:
            desc.innerDiameter === "" || desc.innerDiameter == null
              ? 0
              : Number(desc.innerDiameter),
          length:
            desc.length === "" || desc.length == null ? 0 : Number(desc.length),
          particleSize:
            desc.particleSize === "" || desc.particleSize == null
              ? 0
              : Number(desc.particleSize),
          suffixId: desc.suffixId || null,
          makeId: desc.makeId,
          columnId: desc.columnId?.trim() || "",
          installationDate: desc.installationDate || "",
          usePrefix: !!desc.usePrefix,
          useSuffix: !!desc.useSuffix,
          usePrefixForNewCode: !!desc.usePrefixForNewCode,
          useSuffixForNewCode: !!desc.useSuffixForNewCode,
          isObsolete: !!desc.isObsolete,
        };
      }),
      companyId,
      locationId,
    };

    console.log("Formatted body:", JSON.stringify(formattedBody, null, 2));

    // Validate formatted descriptions
    for (let i = 0; i < formattedBody.descriptions.length; i++) {
      const desc = formattedBody.descriptions[i];
      console.log(
        `Validating description ${i + 1}:`,
        JSON.stringify(desc, null, 2)
      );

      if (!desc.carbonType) {
        console.log(
          `Validation failed: Carbon Type missing for description ${i + 1}`
        );
        return NextResponse.json(
          {
            success: false,
            error: `Carbon Type is required for description ${i + 1}`,
          },
          { status: 400 }
        );
      }

      if (!desc.makeId) {
        console.log(`Validation failed: Make missing for description ${i + 1}`);
        return NextResponse.json(
          {
            success: false,
            error: `Make is required for description ${i + 1}`,
          },
          { status: 400 }
        );
      }

      if (!desc.columnId) {
        console.log(
          `Validation failed: Column ID missing for description ${
            i + 1
          }. Value:`,
          desc.columnId
        );
        return NextResponse.json(
          {
            success: false,
            error: `Column ID is required for description ${
              i + 1
            }. Please select a series to generate a Column ID.`,
          },
          { status: 400 }
        );
      }

      if (!desc.installationDate) {
        console.log(
          `Validation failed: Installation Date missing for description ${
            i + 1
          }`
        );
        return NextResponse.json(
          {
            success: false,
            error: `Installation Date is required for description ${i + 1}`,
          },
          { status: 400 }
        );
      }

      if (isNaN(desc.innerDiameter) || desc.innerDiameter < 0) {
        console.log(
          `Validation failed: Invalid inner diameter for description ${i + 1}:`,
          desc.innerDiameter
        );
        return NextResponse.json(
          {
            success: false,
            error: `Invalid inner diameter for description ${i + 1}`,
          },
          { status: 400 }
        );
      }

      if (isNaN(desc.length) || desc.length < 0) {
        console.log(
          `Validation failed: Invalid length for description ${i + 1}:`,
          desc.length
        );
        return NextResponse.json(
          {
            success: false,
            error: `Invalid length for description ${i + 1}`,
          },
          { status: 400 }
        );
      }

      if (isNaN(desc.particleSize) || desc.particleSize < 0) {
        console.log(
          `Validation failed: Invalid particle size for description ${i + 1}:`,
          desc.particleSize
        );
        return NextResponse.json(
          {
            success: false,
            error: `Invalid particle size for description ${i + 1}`,
          },
          { status: 400 }
        );
      }

      console.log(`Description ${i + 1} validation passed`);
    }

    console.log("All validations passed, proceeding to save");

    const column = new Column(formattedBody);
    console.log("Created model instance");

    const savedColumn = await column.save();
    console.log("Column saved successfully with ID:", savedColumn._id);

    // Create audit log
    const changes: ChangeLog[] = formattedBody.descriptions
      .flatMap((desc: any, index: number) => [
        {
          field: `descriptions[${index}].descriptionId`,
          from: undefined,
          to: desc.descriptionId,
        },
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
      ])
      .filter(
        (change: ChangeLog) => change.to !== undefined && change.to !== ""
      );

    const audit = new Audit({
      action: "create",
      userId: session.user.userId,
      module: "column",
      companyId,
      locationId,
      columnCode: formattedBody.columnCode,
      changes,
    });
    await audit.save();
    console.log("Audit log created");

    console.log("=== POST /api/admin/column SUCCESS ===");
    return NextResponse.json(
      { success: true, data: savedColumn },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("=== POST /api/admin/column ERROR ===");
    console.error("Error details:", error);
    console.error("Error stack:", error.stack);

    if (error.name === "ValidationError") {
      console.log("Mongoose validation error:", error.errors);
      const validationErrors = Object.values(error.errors).map(
        (err: any) => err.message
      );
      return NextResponse.json(
        {
          success: false,
          error: `Validation error: ${validationErrors.join(", ")}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  console.log("=== PUT /api/admin/column START ===");

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

    console.log(
      "Request params - companyId:",
      companyId,
      "locationId:",
      locationId
    );
    console.log("Request body:", JSON.stringify(body, null, 2));

    if (
      !companyId ||
      !locationId ||
      !body.id ||
      !body.columnCode ||
      !body.descriptions
    ) {
      console.log("Missing required parameters or body fields");
      return NextResponse.json(
        {
          success: false,
          error:
            "Company ID, Location ID, column ID, column code, and descriptions are required",
        },
        { status: 400 }
      );
    }

    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Database connected successfully");

    // Format descriptions
    formattedDescriptions = body.descriptions.map(
      (desc: any, index: number) => {
        console.log(
          `Processing description ${index}:`,
          JSON.stringify(desc, null, 2)
        );
        return {
          descriptionId: desc.descriptionId || new mongoose.Types.ObjectId(), // Add descriptionId
          prefixId: desc.prefixId || null,
          carbonType: desc.carbonType?.trim() || "",
          linkedCarbonType: desc.linkedCarbonType?.trim() || "",
          innerDiameter:
            desc.innerDiameter === "" || desc.innerDiameter == null
              ? 0
              : Number(desc.innerDiameter),
          length:
            desc.length === "" || desc.length == null ? 0 : Number(desc.length),
          particleSize:
            desc.particleSize === "" || desc.particleSize == null
              ? 0
              : Number(desc.particleSize),
          suffixId: desc.suffixId || null,
          makeId: desc.makeId,
          columnId: desc.columnId?.trim() || "",
          installationDate: desc.installationDate || "",
          usePrefix: !!desc.usePrefix,
          useSuffix: !!desc.useSuffix,
          usePrefixForNewCode: !!desc.usePrefixForNewCode,
          useSuffixForNewCode: !!desc.useSuffixForNewCode,
          isObsolete: !!desc.isObsolete,
        };
      }
    );

    // Validate descriptions
    for (let i = 0; i < formattedDescriptions.length; i++) {
      const desc = formattedDescriptions[i];
      if (!desc.carbonType) {
        return NextResponse.json(
          {
            success: false,
            error: `Carbon Type is required for description ${i + 1}`,
          },
          { status: 400 }
        );
      }
      if (!desc.makeId) {
        return NextResponse.json(
          {
            success: false,
            error: `Make is required for description ${i + 1}`,
          },
          { status: 400 }
        );
      }
      if (!desc.columnId) {
        return NextResponse.json(
          {
            success: false,
            error: `Column ID is required for description ${i + 1}`,
          },
          { status: 400 }
        );
      }
      if (!desc.installationDate) {
        return NextResponse.json(
          {
            success: false,
            error: `Installation Date is required for description ${i + 1}`,
          },
          { status: 400 }
        );
      }
    }

    // Find and update the column
    const updatedColumn = await Column.findByIdAndUpdate(
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
      console.log("Column not found for update");
      return NextResponse.json(
        { success: false, error: "Column not found" },
        { status: 404 }
      );
    }

    console.log("Column updated successfully with ID:", updatedColumn._id);

    // Create audit log
    const changes = formattedDescriptions.flatMap(
      (desc: any, index: number) => [
        {
          field: `descriptions[${index}].descriptionId`,
          from: undefined, // Could track previous values if needed
          to: desc.descriptionId,
        },
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
          field: `descriptions[${index}].isObsolete`,
          from: undefined,
          to: desc.isObsolete,
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
      ]
    );

    const audit = new Audit({
      action: "update",
      userId: session.user.userId,
      module: "column",
      companyId,
      locationId,
      columnCode: body.columnCode,
      changes,
    });
    await audit.save();
    console.log("Audit log created");

    console.log("=== PUT /api/admin/column SUCCESS ===");
    return NextResponse.json(
      { success: true, data: updatedColumn },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("=== PUT /api/admin/column ERROR ===");
    console.error("Error details:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const companyId = req.nextUrl.searchParams.get("companyId");
    const locationId = req.nextUrl.searchParams.get("locationId");
    const id = req.nextUrl.searchParams.get("id");

    if (!companyId || !locationId || !id) {
      return NextResponse.json(
        {
          success: false,
          error: "Company ID, Location ID, and Column ID are required",
        },
        { status: 400 }
      );
    }

    await mongoose.connect(process.env.MONGODB_URI!);

    const column = await Column.findOneAndDelete({
      _id: id,
      companyId,
      locationId,
    });

    if (!column) {
      return NextResponse.json(
        { success: false, error: "Column not found" },
        { status: 404 }
      );
    }

    // Create audit log
    const audit = new Audit({
      action: "delete",
      userId: session.user.userId,
      module: "column",
      companyId,
      locationId,
      columnCode: column.columnCode,
      changes: [{ field: "column", from: column.columnCode, to: "deleted" }],
    });
    await audit.save();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/admin/column error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
