// /api/admin/detector-type/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import DetectorType from '@/models/detectorType';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  broadcastMasterDataCreate,
  broadcastMasterDataUpdate,
  broadcastMasterDataDelete 
} from "@/lib/sse";

// Helper function to validate DetectorType data
function validateDetectorTypeData(data: any) {
  const errors: string[] = [];
  if (!data.detectorType) {
    errors.push('Detector type name is required');
  } else if (typeof data.detectorType !== 'string') {
    errors.push('Detector type name must be a string');
  } else if (data.detectorType.trim().length === 0) {
    errors.push('Detector type name cannot be empty');
  } else if (data.detectorType.trim().length > 100) {
    errors.push('Detector type name cannot exceed 100 characters');
  }
  if (data.description && typeof data.description !== 'string') {
    errors.push('Description must be a string');
  } else if (data.description && data.description.length > 500) {
    errors.push('Description cannot exceed 500 characters');
  }
  if (!data.companyId) {
    errors.push('Company ID is required');
  } else if (typeof data.companyId !== 'string' || data.companyId.trim().length === 0) {
    errors.push('Company ID must be a non-empty string');
  }
  if (!data.locationId) {
    errors.push('Location ID is required');
  } else if (typeof data.locationId !== 'string' || data.locationId.trim().length === 0) {
    errors.push('Location ID must be a non-empty string');
  }
  return errors;
}

// Helper function to validate companyId and locationId against session
function validateCompanyAndLocation(session: any, companyId: string, locationId: string) {
  // If session validation is simplified, just return true for now
  // You can implement proper validation based on your session structure
  return true;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
   
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { detectorType, description, companyId, locationId } = body;

    // Validate input data
    const validationErrors = validateDetectorTypeData({ detectorType, description, companyId, locationId });
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: validationErrors.join(', '), validationErrors },
        { status: 400 }
      );
    }

    // Check for existing detectorType
    const existingDetectorType = await DetectorType.findOne({ detectorType: detectorType.trim(), companyId, locationId });
    if (existingDetectorType) {
      return NextResponse.json(
        { success: false, error: 'Detector type already exists' },
        { status: 409 }
      );
    }

    // Create new detectorType
    const newDetectorType = new DetectorType({
      detectorType: detectorType.trim(),
      description: description?.trim() || '',
      companyId,
      locationId,
      createdBy: session.user?.id || "system",
      updatedBy: session.user?.id || "system",
    });
   
    const savedDetectorType = await newDetectorType.save();

    // Broadcast the create event to SSE clients
    broadcastMasterDataCreate(
      "detectorTypes",
      savedDetectorType.toObject(),
      companyId,
      locationId
    );
   
    return NextResponse.json({
      success: true,
      data: savedDetectorType,
      message: "Detector Type created successfully",
    });
  } catch (error: any) {
    console.error("Create detector type error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

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

    const detectorTypes = await DetectorType.find({ companyId, locationId })
      .sort({ detectorType: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: detectorTypes,
    });
  } catch (error: any) {
    console.error("Fetch detector types error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const { id, detectorType, description, companyId, locationId } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Detector Type ID is required" },
        { status: 400 }
      );
    }

    if (!detectorType?.trim()) {
      return NextResponse.json(
        { success: false, error: "Detector Type is required" },
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

    // Get the existing detector type for comparison
    const existingDetectorType = await DetectorType.findOne({
      _id: id,
      companyId,
      locationId,
    });

    if (!existingDetectorType) {
      return NextResponse.json(
        { success: false, error: "Detector Type not found" },
        { status: 404 }
      );
    }

    // Check if the new name conflicts with another detector type
    const duplicateDetectorType = await DetectorType.findOne({
      detectorType: detectorType.trim(),
      companyId,
      locationId,
      _id: { $ne: id },
    });

    if (duplicateDetectorType) {
      return NextResponse.json(
        { success: false, error: "Detector Type name already exists" },
        { status: 409 }
      );
    }

    // Update the detector type
    const updatedDetectorType = await DetectorType.findByIdAndUpdate(
      id,
      {
        detectorType: detectorType.trim(),
        description: description?.trim() || "",
        updatedBy: session.user?.id || "system",
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedDetectorType) {
      return NextResponse.json(
        { success: false, error: "Failed to update Detector Type" },
        { status: 500 }
      );
    }

    // Broadcast the update event to SSE clients
    broadcastMasterDataUpdate(
      "detectorTypes",
      updatedDetectorType.toObject(),
      companyId,
      locationId
    );

    return NextResponse.json({
      success: true,
      data: updatedDetectorType,
      message: "Detector Type updated successfully",
    });
  } catch (error: any) {
    console.error("Update detector type error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

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
        { success: false, error: "Detector Type ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get the detector type before deleting for broadcasting
    const detectorTypeToDelete = await DetectorType.findById(id);

    if (!detectorTypeToDelete) {
      return NextResponse.json(
        { success: false, error: "Detector Type not found" },
        { status: 404 }
      );
    }

    // Delete the detector type
    const deletedDetectorType = await DetectorType.findByIdAndDelete(id);

    if (!deletedDetectorType) {
      return NextResponse.json(
        { success: false, error: "Failed to delete Detector Type" },
        { status: 500 }
      );
    }

    // Broadcast the delete event to SSE clients
    broadcastMasterDataDelete(
      "detectorTypes",
      deletedDetectorType.toObject(),
      detectorTypeToDelete.companyId,
      detectorTypeToDelete.locationId
    );

    return NextResponse.json({
      success: true,
      message: "Detector Type deleted successfully",
      data: deletedDetectorType,
    });
  } catch (error: any) {
    console.error("Delete detector type error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}