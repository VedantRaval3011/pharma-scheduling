// api/admin/column/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Column from "@/models/column";
import ObsoleteColumn from "@/models/obsoleteColumn";
import Audit from "@/models/columnAudit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("=== GET /api/admin/column/[id] START ===");
  
  // Await params to resolve the promise
  const resolvedParams = await params;
  console.log("Column ID:", resolvedParams.id);

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
    const { id } = resolvedParams;

    console.log("Query params - companyId:", companyId, "locationId:", locationId);
    console.log("Path param - id:", id);

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
    console.log("Database connected successfully");

    // First try to find in the regular Column collection
    let column = await Column.findOne({
      _id: id,
      companyId,
      locationId,
    });

    let isObsolete = false;

    if (column) {
      console.log("Found column in regular table:", column.columnCode, "with", column.descriptions?.length || 0, "descriptions");
    } else {
      // Try to find in ObsoleteColumn collection
      console.log("Column not found in regular table, checking obsolete table...");
      column = await ObsoleteColumn.findOne({
        _id: id,
        companyId,
        locationId,
      });

      if (column) {
        console.log("Found column in obsolete table:", column.columnCode, "with", column.descriptions?.length || 0, "descriptions");
        isObsolete = true;
      }
    }

    if (!column) {
      console.log("Column not found in either table");
      return NextResponse.json(
        { success: false, error: "Column not found" },
        { status: 404 }
      );
    }

    console.log(`Column found successfully in ${isObsolete ? 'obsolete' : 'regular'} table`);

    // Prepare response data with additional metadata
    const columnData = {
      ...column.toObject(),
      isObsolete,
      status: isObsolete ? 'obsolete' : 'active',
      descriptionsCount: column.descriptions?.length || 0
    };

    console.log("=== GET /api/admin/column/[id] SUCCESS ===");
    return NextResponse.json({ 
      success: true, 
      data: columnData,
      message: `${isObsolete ? 'Obsolete' : 'Active'} column ${column.columnCode} retrieved successfully`
    });

  } catch (error: any) {
    console.error("=== GET /api/admin/column/[id] ERROR ===");
    console.error("Error details:", error);
    console.error("Error stack:", error.stack);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("=== DELETE /api/admin/column/[id] START ===");
  
  // Await params to resolve the promise
  const resolvedParams = await params;
  console.log("Column ID:", resolvedParams.id);

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
    const { id } = resolvedParams;

    console.log("Query params - companyId:", companyId, "locationId:", locationId);
    console.log("Path param - id:", id);

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
    console.log("Database connected successfully");

    // First try to find in the regular Column collection
    let column = await Column.findOne({
      _id: id,
      companyId,
      locationId,
    });

    let isObsolete = false;
    let deletedColumn = null;

    if (column) {
      console.log("Found column in regular table:", column.columnCode, "with", column.descriptions.length, "descriptions");
      
      // Delete from regular Column collection
      deletedColumn = await Column.findOneAndDelete({
        _id: id,
        companyId,
        locationId,
      });
    } else {
      // Try to find in ObsoleteColumn collection
      console.log("Column not found in regular table, checking obsolete table...");
      column = await ObsoleteColumn.findOne({
        _id: id,
        companyId,
        locationId,
      });

      if (column) {
        console.log("Found column in obsolete table:", column.columnCode, "with", column.descriptions.length, "descriptions");
        isObsolete = true;
        
        // Delete from ObsoleteColumn collection
        deletedColumn = await ObsoleteColumn.findOneAndDelete({
          _id: id,
          companyId,
          locationId,
        });
      }
    }

    if (!deletedColumn) {
      console.log("Column not found in either table");
      return NextResponse.json(
        { success: false, error: "Column not found" },
        { status: 404 }
      );
    }

    console.log(`Column deleted successfully from ${isObsolete ? 'obsolete' : 'regular'} table`);

    // Create audit log
    const audit = new Audit({
      action: "delete",
      userId: session.user.userId,
      module: "column",
      companyId,
      locationId,
      columnCode: deletedColumn.columnCode,
      changes: [
        { 
          field: "column", 
          from: `${deletedColumn.columnCode} (${deletedColumn.descriptions.length} descriptions) - ${isObsolete ? 'Obsolete' : 'Active'}`, 
          to: "deleted" 
        }
      ],
    });
    await audit.save();
    console.log("Audit log created");

    console.log("=== DELETE /api/admin/column/[id] SUCCESS ===");
    return NextResponse.json({ 
      success: true, 
      message: `${isObsolete ? 'Obsolete' : 'Active'} column ${deletedColumn.columnCode} deleted successfully`
    });

  } catch (error: any) {
    console.error("=== DELETE /api/admin/column/[id] ERROR ===");
    console.error("Error details:", error);
    console.error("Error stack:", error.stack);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}