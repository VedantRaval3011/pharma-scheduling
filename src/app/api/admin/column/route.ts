// api/admin/column/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Column from "@/models/column";
import Audit from "@/models/columnAudit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface ChangeLog {
  field: string;
  from: any;
  to: any;
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

    if (!companyId || !locationId) {
      return NextResponse.json(
        { success: false, error: "Company ID and Location ID are required" },
        { status: 400 }
      );
    }

    await mongoose.connect(process.env.MONGODB_URI!);
    const columns = await Column.find({ companyId, locationId }).sort({
      columnCode: 1,
    });

    return NextResponse.json({ success: true, data: columns });
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

    // Check if column code already exists
    const existingColumn = await Column.findOne({
      columnCode: body.columnCode,
      companyId,
      locationId,
    });
    console.log("Existing column check:", !!existingColumn);

    if (existingColumn) {
      console.log("Column code already exists:", body.columnCode);
      return NextResponse.json(
        {
          success: false,
          error: "Column code already exists",
        },
        { status: 400 }
      );
    }

    const formattedBody = {
      columnCode: body.columnCode.trim(),
      descriptions: body.descriptions.map((desc: any, index: number) => {
        console.log(
          `Processing description ${index}:`,
          JSON.stringify(desc, null, 2)
        );
        return {
          prefix: desc.prefix?.trim() || "",
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
          suffix: desc.suffix?.trim() || "",
          make: desc.make?.trim() || "",
          columnId: desc.columnId?.trim() || "",
          installationDate: desc.installationDate || "",
          usePrefix: !!desc.usePrefix,
          useSuffix: !!desc.useSuffix,
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

      if (!desc.make) {
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
          `Validation failed: Invalid inner diameter for description ${
            i + 1
          }:`,
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
          `Validation failed: Invalid particle size for description ${
            i + 1
          }:`,
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

    if (error.code === 11000) {
      console.log("Duplicate key error");
      return NextResponse.json(
        {
          success: false,
          error: "Column code already exists",
        },
        { status: 400 }
      );
    }

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
    const { id, ...body } = await req.json();

    console.log("PUT Request - ID:", id);
    console.log("PUT Request body:", JSON.stringify(body, null, 2));

    if (!companyId || !locationId || !id) {
      console.log("Missing required parameters");
      return NextResponse.json(
        {
          success: false,
          error: "Company ID, Location ID, and Column ID are required",
        },
        { status: 400 }
      );
    }

    await mongoose.connect(process.env.MONGODB_URI!);

    // Find the existing column
    const oldColumn = await Column.findOne({ _id: id, companyId, locationId });

    if (!oldColumn) {
      console.log("Column not found");
      return NextResponse.json(
        { success: false, error: "Column not found" },
        { status: 404 }
      );
    }

    console.log(
      "Found existing column with",
      oldColumn.descriptions.length,
      "descriptions"
    );

    const formattedBody = {
      columnCode: body.columnCode.trim(),
      descriptions: body.descriptions.map((desc: any, index: number) => {
        const isExistingDesc = index < oldColumn.descriptions.length;
        const originalDesc = isExistingDesc ? oldColumn.descriptions[index] : null;

        if (isExistingDesc) {
          console.log(`Preserving existing description ${index} data`);
          return {
            prefix: desc.prefix?.trim() || originalDesc.prefix || "",
            carbonType: desc.carbonType?.trim() || originalDesc.carbonType || "",
            linkedCarbonType: desc.linkedCarbonType?.trim() || originalDesc.linkedCarbonType || "",
            innerDiameter: desc.innerDiameter === "" || desc.innerDiameter == null
              ? originalDesc.innerDiameter || 0
              : Number(desc.innerDiameter),
            length: desc.length === "" || desc.length == null
              ? originalDesc.length || 0
              : Number(desc.length),
            particleSize: desc.particleSize === "" || desc.particleSize == null
              ? originalDesc.particleSize || 0
              : Number(desc.particleSize),
            suffix: desc.suffix?.trim() || originalDesc.suffix || "",
            make: desc.make?.trim() || originalDesc.make || "",
            columnId: originalDesc.columnId || desc.columnId?.trim() || "",
            installationDate: originalDesc.installationDate || desc.installationDate || "",
            usePrefix: desc.usePrefix !== undefined ? !!desc.usePrefix : !!originalDesc.usePrefix,
            useSuffix: desc.useSuffix !== undefined ? !!desc.useSuffix : !!originalDesc.useSuffix,
            isObsolete: desc.isObsolete !== undefined ? !!desc.isObsolete : !!originalDesc.isObsolete,
          };
        } else {
          console.log(`Processing new description ${index}`);
          return {
            prefix: desc.prefix?.trim() || "",
            carbonType: desc.carbonType?.trim() || "",
            linkedCarbonType: desc.linkedCarbonType?.trim() || "",
            innerDiameter: desc.innerDiameter === "" || desc.innerDiameter == null ? 0 : Number(desc.innerDiameter),
            length: desc.length === "" || desc.length == null ? 0 : Number(desc.length),
            particleSize: desc.particleSize === "" || desc.particleSize == null ? 0 : Number(desc.particleSize),
            suffix: desc.suffix?.trim() || "",
            make: desc.make?.trim() || "",
            columnId: desc.columnId?.trim() || "",
            installationDate: desc.installationDate || "",
            usePrefix: !!desc.usePrefix,
            useSuffix: !!desc.useSuffix,
            isObsolete: !!desc.isObsolete,
          };
        }
      }),
      companyId,
      locationId,
    };

    console.log(
      "Formatted body for validation:",
      JSON.stringify(formattedBody, null, 2)
    );

    // Validate all descriptions
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

      if (!desc.make) {
        console.log(
          `Validation failed: Make missing for description ${i + 1}`
        );
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
          `Validation failed: Column ID missing for description ${i + 1}`
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
          `Validation failed: Invalid inner diameter for description ${
            i + 1
          }`
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
          `Validation failed: Invalid length for description ${i + 1}`
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
          `Validation failed: Invalid particle size for description ${
            i + 1
          }`
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

    console.log("All description validations passed");

    const updatedColumn = await Column.findOneAndUpdate(
      { _id: id, companyId, locationId },
      formattedBody,
      { new: true, runValidators: true }
    );

    if (!updatedColumn) {
      console.log("Column not found for update");
      return NextResponse.json(
        { success: false, error: "Column not found" },
        { status: 404 }
      );
    }

    console.log("Column updated successfully");

    // Generate field-level changes for audit
    const changes: ChangeLog[] = [];
    const oldDescs = oldColumn.descriptions;
    const newDescs = updatedColumn.descriptions;

    for (let i = 0; i < Math.max(oldDescs.length, newDescs.length); i++) {
      const oldDesc = oldDescs[i] || {};
      const newDesc = newDescs[i] || {};
      const fields = [
        "prefix",
        "carbonType",
        "linkedCarbonType",
        "innerDiameter",
        "length",
        "particleSize",
        "suffix",
        "make",
        "columnId",
        "installationDate",
        "usePrefix",
        "useSuffix",
        "isObsolete",
      ];
      fields.forEach((field) => {
        if (oldDesc[field] !== newDesc[field]) {
          changes.push({
            field: `descriptions[${i}].${field}`,
            from: oldDesc[field],
            to: newDesc[field],
          });
        }
      });
    }

    if (oldColumn.columnCode !== updatedColumn.columnCode) {
      changes.push({
        field: "columnCode",
        from: oldColumn.columnCode,
        to: updatedColumn.columnCode,
      });
    }

    // Create audit log
    const audit = new Audit({
      action: "update",
      userId: session.user.userId,
      module: "column",
      companyId,
      locationId,
      columnCode: updatedColumn.columnCode,
      changes:
        changes.length > 0
          ? changes
          : [{ field: "No changes detected", from: null, to: null }],
    });
    await audit.save();

    console.log("=== PUT /api/admin/column SUCCESS ===");
    return NextResponse.json({ success: true, data: updatedColumn });
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
    const id = req.nextUrl.searchParams.get("id"); // Changed to query param for consistency

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