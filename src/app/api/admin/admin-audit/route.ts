import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { AdminAuditLog } from "@/models/adminAudit";
import mongoose from "mongoose";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.userId) {
      console.error("Unauthorized: No session user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { adminId, userId, action, details } = body;

    if (!adminId || !userId || !action || !details) {
      console.error("Missing required fields:", { adminId, userId, action, details });
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["CREATE", "UPDATE", "DELETE", "CHANGE_PASSWORD"].includes(action)) {
      console.error("Invalid action:", action);
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await mongoose.connect(process.env.MONGODB_URI!);

    const auditLog = new AdminAuditLog({
      adminId,
      userId,
      action,
      performedBy: session.user.userId,
      details,
    });

    await auditLog.save();
    console.log("Audit log saved:", { auditId: auditLog.auditId, adminId, action });

    return NextResponse.json({ message: "Audit log created", auditId: auditLog.auditId }, { status: 201 });
  } catch (error) {
    console.error("Error creating audit log:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.userId) {
      console.error("Unauthorized: No session user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAuditPermission = ["super_admin", "admin"].includes(session.user.role) ||
      session.user.moduleAccess?.some(
        (m: any) => (m.modulePath === "/admin-details" || m.modulePath === "*") && m.permissions.includes("audit")
      );

    if (!hasAuditPermission) {
      console.error("Forbidden: User lacks audit permission", { userId: session.user.userId });
      return NextResponse.json({ error: "Forbidden: Audit permission required" }, { status: 403 });
    }

    await mongoose.connect(process.env.MONGODB_URI!);

    const auditLogs = await AdminAuditLog.find()
      .sort({ timestamp: -1 })
      .limit(100);

    console.log(`Fetched ${auditLogs.length} audit logs`);
    return NextResponse.json(auditLogs, { status: 200 });
  } catch (error) {
    console.error("Error fetching all audit logs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}