import { NextRequest, NextResponse } from "next/server";
import roleAssignmentAudit from "@/models/roleAssignmentAudits";
import dbConenct from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    await dbConenct();
    const { employeeId, updatedBy, changes } = await req.json();

    if (!employeeId || !updatedBy || !changes) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const auditLog = new roleAssignmentAudit({
      employeeId,
      updatedBy,
      changes,
    });

    await auditLog.save();

    return NextResponse.json(
      { message: "Audit log created successfully", data: auditLog },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating audit log:", error);
    return NextResponse.json(
      { error: "Failed to create audit log" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await dbConenct();
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    const auditLogs = await roleAssignmentAudit.find({ employeeId }).sort({
      timestamp: -1,
    });

    return NextResponse.json({ data: auditLogs }, { status: 200 });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}

