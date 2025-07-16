import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuditLog } from "@/models/audit";
import mongoose from "mongoose";
import { Employee } from "@/models/employee";

interface AuditLogDetails {
  performedBy?: string;
  performedByName?: string;
  sessionInfo?: {
    userId?: string;
    userName?: string;
    userEmail?: string;
    userRole?: string;
    timestamp?: string;
  };
  [key: string]: any; // allow other dynamic fields
}

// GET method - fetch audit logs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    
    console.log("=== AUDIT LOG DEBUG ===");
    console.log("Requested employeeId:", employeeId);

    await connectDB();

    let query = {};
    if (employeeId) {
      // Search by both employeeId (UUID) and userId (user-friendly ID)
      query = {
        $or: [
          { employeeId: employeeId.toUpperCase() },
          { "details.userId": employeeId },
          { "details.userId": employeeId.toUpperCase() },
          { "details.employeeId": employeeId },
          { "details.employeeId": employeeId.toUpperCase() }
        ]
      };
    }
    
    console.log("Query being used:", JSON.stringify(query, null, 2));

    const auditLogs = await AuditLog.find(query).sort({ timestamp: -1 });
    console.log("Found audit logs:", auditLogs.length);

    // Enhanced formatting for frontend consumption
    const formattedLogs = auditLogs.map((log) => {
      let parsedDetails: AuditLogDetails = {};
      try {
        // Handle both string and object details
        if (typeof log.details === 'string') {
          parsedDetails = JSON.parse(log.details);
        } else if (log.details && typeof log.details === 'object') {
          parsedDetails = log.details;
        } else {
          parsedDetails = {};
        }
      } catch (err) {
        console.error("Failed to parse audit log details:", err);
        console.error("Details content:", log.details);
        parsedDetails = { error: "Invalid details format", raw: log.details };
      }

      return {
        _id: log._id,
        action: log.action,
        timestamp: log.timestamp,
        userId: log.userId,
        employeeId: log.employeeId,
        performedBy: log.performedBy || parsedDetails.performedBy || 'Unknown',
        details: parsedDetails,
      };
    });

    // Deduplicate logs - remove entries with ObjectId-like userId when a user-friendly version exists
    const deduplicatedLogs = formattedLogs.filter((log, index, arr) => {
      // Check if this log has an ObjectId-like userId (24 hex characters)
      const isObjectIdLike = /^[0-9a-fA-F]{24}$/.test(log.userId);
      
      if (!isObjectIdLike) {
        return true; // Keep non-ObjectId entries
      }
      
      // For ObjectId-like entries, check if there's a duplicate with user-friendly ID
      const timeWindow = 5000; // 5 seconds window for considering duplicates
      const logTime = new Date(log.timestamp).getTime();
      
      const hasDuplicate = arr.some((otherLog, otherIndex) => {
        if (index === otherIndex) return false; // Skip self
        
        const otherLogTime = new Date(otherLog.timestamp).getTime();
        const timeDiff = Math.abs(logTime - otherLogTime);
        
        return (
          log.action === otherLog.action &&
          log.employeeId === otherLog.employeeId &&
          timeDiff <= timeWindow &&
          !(/^[0-9a-fA-F]{24}$/.test(otherLog.userId)) && // Other log has user-friendly ID
          log.details.message?.includes('field(s) changed') // This is the auto-generated message
        );
      });
      
      return !hasDuplicate; // Keep only if no duplicate found
    });

    console.log("Formatted logs:", formattedLogs.length);
    console.log("Deduplicated logs:", deduplicatedLogs.length);
    console.log("=== END DEBUG ===");

    return NextResponse.json(deduplicatedLogs, { status: 200 });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST method - create audit log
export async function POST(request: NextRequest) {
  try {
    console.log("=== AUDIT LOG POST REQUEST ===");
    
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      console.log("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("Request body received:", body);

    const { action, employeeId, userId, details } = body;

    // Validate required fields
    if (!action || !employeeId || !userId || !details) {
      console.error("Missing required fields:", {
        action: !!action,
        employeeId: !!employeeId,
        userId: !!userId,
        details: !!details
      });
      return NextResponse.json(
        { error: "Missing required fields: action, employeeId, userId, details" },
        { status: 400 }
      );
    }

    await connectDB();

    // Create audit log entry
    const auditLogData = {
      action,
      employeeId,
      userId,
      performedBy: session.user.id,
      timestamp: new Date(),
      details: typeof details === 'string' ? details : JSON.stringify(details)
    };

    console.log("Creating audit log with data:", auditLogData);

    const auditLog = new AuditLog(auditLogData);
    await auditLog.save();

    console.log("Audit log saved successfully:", auditLog._id);
    console.log("=== END AUDIT LOG POST ===");

    return NextResponse.json(
      { 
        message: "Audit log created successfully", 
        id: auditLog._id,
        data: auditLog 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Error creating audit log:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error,
      errorType: Object.prototype.toString.call(error),
    });
    
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// PUT method - update employee with audit logging
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { employeeId, ...updateData } = body;

    await connectDB();

    // Get the current employee data BEFORE updating
    const currentEmployee = await Employee.findById(employeeId);
    if (!currentEmployee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Create a copy of current data for comparison
    const oldData = currentEmployee.toObject();

    // Update the employee
    const updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId,
      updateData,
      { new: true, runValidators: true }
    );

    // Detect ONLY actual changes
    const actualChanges = detectActualChanges(oldData, updatedEmployee.toObject(), updateData);

    // Only create audit log if there are actual changes
    if (actualChanges.length > 0) {
      const auditDetails = {
        message: `Employee updated successfully`,
        performedBy: session.user.id,
        performedByName: session.user.name || session.user.email || "Unknown User",
        changes: actualChanges,
        timestamp: new Date().toISOString(),
      };

      // Create audit log entry - ONLY ONCE
      await fetch(`${process.env.NEXTAUTH_URL}/api/admin/audit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "UPDATE",
          employeeId: updatedEmployee.employeeId, // Use the employee's user-friendly ID
          userId: updatedEmployee.userId, // Use the employee's user-friendly ID
          details: auditDetails,
        }),
      });
    }

    return NextResponse.json({
      message: "Employee updated successfully",
      data: updatedEmployee,
    });
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to detect only actual changes
function detectActualChanges(oldData: any, newData: any, updateData: any) {
  const changes = [];
  
  // Only check fields that were actually sent in the update request
  for (const [field, newValue] of Object.entries(updateData)) {
    // Skip internal fields
    if (field.startsWith('_') || field === 'updatedAt' || field === 'createdAt') {
      continue;
    }

    const oldValue = oldData[field];
    
    // Compare values - handle arrays and objects properly
    if (!valuesAreEqual(oldValue, newValue)) {
      changes.push({
        field,
        oldValue: formatValue(oldValue),
        newValue: formatValue(newValue),
      });
    }
  }
  
  return changes;
}

// Helper function to properly compare values
function valuesAreEqual(oldValue: any, newValue: any): boolean {
  // Handle null/undefined
  if (oldValue === null || oldValue === undefined) {
    return newValue === null || newValue === undefined;
  }
  
  // Handle arrays
  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    if (oldValue.length !== newValue.length) return false;
    return oldValue.every((item, index) => item === newValue[index]);
  }
  
  // Handle objects (like dates)
  if (oldValue instanceof Date && newValue instanceof Date) {
    return oldValue.getTime() === newValue.getTime();
  }
  
  // Handle strings/numbers/booleans
  return oldValue === newValue;
}

// Helper function to format values for display
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return "None";
  }
  
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "None";
  }
  
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  
  return String(value);
}