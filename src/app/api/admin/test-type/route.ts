// app/api/admin/testType/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import TestType from "@/models/test-type";
import { 
  broadcastMasterDataCreate,
  broadcastMasterDataUpdate,
  broadcastMasterDataDelete 
} from "@/lib/sse";

// GET - Fetch test types
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const locationId = searchParams.get("locationId");

    if (!companyId || !locationId) {
      return NextResponse.json(
        { success: false, error: "Company ID and Location ID are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const testTypes = await TestType.find({ companyId, locationId })
      .sort({ testType: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: testTypes,
    });
  } catch (error: any) {
    console.error("Fetch test types error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new test type
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    // Changed from 'desc' to 'description' to match frontend
    const { testType, description, companyId, locationId } = body;

    if (!testType?.trim()) {
      return NextResponse.json(
        { success: false, error: "Test Type is required" },
        { status: 400 }
      );
    }

    if (!companyId || !locationId) {
      return NextResponse.json(
        { success: false, error: "Company ID and Location ID are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if test type already exists
    const existingTestType = await TestType.findOne({
      testType: testType.trim(),
      companyId,
      locationId,
    });

    if (existingTestType) {
      return NextResponse.json(
        { success: false, error: "Test Type already exists" },
        { status: 409 }
      );
    }

    // Create new test type
    const newTestType = new TestType({
      testType: testType.trim(),
      // Changed from 'desc' to 'description' to match frontend
      description: description?.trim() || "",
      companyId,
      locationId,
      createdBy: session.user?.id || "system",
      updatedBy: session.user?.id || "system",
    });

    const savedTestType = await newTestType.save();

    // Broadcast the create event to SSE clients
    broadcastMasterDataCreate(
      "testTypes",
      savedTestType.toObject(),
      companyId,
      locationId
    );

    return NextResponse.json({
      success: true,
      data: savedTestType,
      message: "Test Type created successfully",
    });
  } catch (error: any) {
    console.error("Create test type error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update existing test type
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    // Changed from 'desc' to 'description' to match frontend
    const { id, testType, description, companyId, locationId } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Test Type ID is required" },
        { status: 400 }
      );
    }

    if (!testType?.trim()) {
      return NextResponse.json(
        { success: false, error: "Test Type is required" },
        { status: 400 }
      );
    }

    if (!companyId || !locationId) {
      return NextResponse.json(
        { success: false, error: "Company ID and Location ID are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get the existing test type for comparison
    const existingTestType = await TestType.findOne({
      _id: id,
      companyId,
      locationId,
    });

    if (!existingTestType) {
      return NextResponse.json(
        { success: false, error: "Test Type not found" },
        { status: 404 }
      );
    }

    // Check if the new name conflicts with another test type
    const duplicateTestType = await TestType.findOne({
      testType: testType.trim(),
      companyId,
      locationId,
      _id: { $ne: id },
    });

    if (duplicateTestType) {
      return NextResponse.json(
        { success: false, error: "Test Type name already exists" },
        { status: 409 }
      );
    }

    // Update the test type
    const updatedTestType = await TestType.findByIdAndUpdate(
      id,
      {
        testType: testType.trim(),
        // Changed from 'desc' to 'description' to match frontend
        description: description?.trim() || "",
        updatedBy: session.user?.id || "system",
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedTestType) {
      return NextResponse.json(
        { success: false, error: "Failed to update Test Type" },
        { status: 500 }
      );
    }

    // Broadcast the update event to SSE clients
    broadcastMasterDataUpdate(
      "testTypes",
      updatedTestType.toObject(),
      companyId,
      locationId
    );

    return NextResponse.json({
      success: true,
      data: updatedTestType,
      message: "Test Type updated successfully",
    });
  } catch (error: any) {
    console.error("Update test type error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete test type
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Test Type ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get the test type before deleting for broadcasting
    const testTypeToDelete = await TestType.findById(id);

    if (!testTypeToDelete) {
      return NextResponse.json(
        { success: false, error: "Test Type not found" },
        { status: 404 }
      );
    }

    // Delete the test type
    const deletedTestType = await TestType.findByIdAndDelete(id);

    if (!deletedTestType) {
      return NextResponse.json(
        { success: false, error: "Failed to delete Test Type" },
        { status: 500 }
      );
    }

    // Broadcast the delete event to SSE clients
    broadcastMasterDataDelete(
      "testTypes",
      deletedTestType.toObject(),
      testTypeToDelete.companyId,
      testTypeToDelete.locationId
    );

    return NextResponse.json({
      success: true,
      message: "Test Type deleted successfully",
      data: deletedTestType,
    });
  } catch (error: any) {
    console.error("Delete test type error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}