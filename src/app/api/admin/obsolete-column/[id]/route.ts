// Create this file at: /api/admin/obsolete-column/[id]/route.ts

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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log("=== DELETE /api/admin/obsolete-column/[id] START ===");

  const companyId = req.nextUrl.searchParams.get("companyId");
  const locationId = req.nextUrl.searchParams.get("locationId");
  const columnId = params.id;

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      console.log("Authentication failed - no session");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("Request params - companyId:", companyId, "locationId:", locationId, "columnId:", columnId);

    if (!companyId || !locationId || !columnId) {
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

    // Find the column first to get details for audit
    const columnToDelete = await ObsoleteColumn.findOne({
      _id: columnId,
      companyId,
      locationId,
    });
    
    if (!columnToDelete) {
      console.log("Obsolete column not found for deletion");
      return NextResponse.json(
        { success: false, error: "Obsolete column not found" },
        { status: 404 }
      );
    }

    // Delete the obsolete column
    await ObsoleteColumn.findOneAndDelete({
      _id: columnId,
      companyId,
      locationId,
    });
    
    console.log("Obsolete column deleted successfully with ID:", columnId);

    // Create audit log
    const audit = new Audit({
      action: "delete",
      userId: session.user.userId,
      module: "column",
      companyId,
      locationId,
      columnCode: columnToDelete.columnCode,
      changes: [
        {
          field: "status",
          from: "obsolete",
          to: "deleted",
        },
      ],
    });
    await audit.save();
    console.log("Delete audit log created");

    console.log("=== DELETE /api/admin/obsolete-column/[id] SUCCESS ===");
    return NextResponse.json({ 
      success: true, 
      message: "Obsolete column deleted successfully",
      deletedId: columnId 
    }, { status: 200 });

  } catch (error: any) {
    console.error("=== DELETE /api/admin/obsolete-column/[id] ERROR ===");
    console.error("Error details:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}