import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Pharmacopoeial from '@/models/pharmacopeial';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  broadcastMasterDataCreate,
  broadcastMasterDataUpdate,
  broadcastMasterDataDelete 
} from "@/lib/sse";

// Helper function to validate Pharmacopoeial data
function validatePharmacopoeialData(data: any) {
  const errors: string[] = [];
  if (!data.pharmacopoeial) {
    errors.push('Pharmacopoeial name is required');
  } else if (typeof data.pharmacopoeial !== 'string') {
    errors.push('Pharmacopoeial name must be a string');
  } else if (data.pharmacopoeial.trim().length === 0) {
    errors.push('Pharmacopoeial name cannot be empty');
  } else if (data.pharmacopoeial.trim().length > 100) {
    errors.push('Pharmacopoeial name cannot exceed 100 characters');
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
    const { pharmacopoeial, description, companyId, locationId } = body;

    // Validate input data
    const validationErrors = validatePharmacopoeialData({ pharmacopoeial, description, companyId, locationId });
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: validationErrors.join(', '), validationErrors },
        { status: 400 }
      );
    }

    // Check for existing pharmacopoeial
    const existingPharmacopoeial = await Pharmacopoeial.findOne({ pharmacopoeial: pharmacopoeial.trim(), companyId, locationId });
    if (existingPharmacopoeial) {
      return NextResponse.json(
        { success: false, error: 'Pharmacopoeial already exists' },
        { status: 409 }
      );
    }

    // Create new pharmacopoeial
    const newPharmacopoeial = new Pharmacopoeial({
      pharmacopoeial: pharmacopoeial.trim(),
      description: description?.trim() || '',
      companyId,
      locationId,
      createdBy: session.user?.id || "system",
      updatedBy: session.user?.id || "system",
    });

    const savedPharmacopoeial = await newPharmacopoeial.save();

    // Broadcast the create event to SSE clients
    broadcastMasterDataCreate(
      "pharmacopoeials",
      savedPharmacopoeial.toObject(),
      companyId,
      locationId
    );

    return NextResponse.json({
      success: true,
      data: savedPharmacopoeial,
      message: "Pharmacopoeial created successfully",
    });
  } catch (error: any) {
    console.error("Create pharmacopoeial error:", error);
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

    const pharmacopoeials = await Pharmacopoeial.find({ companyId, locationId })
      .sort({ pharmacopoeial: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: pharmacopoeials,
    });
  } catch (error: any) {
    console.error("Fetch pharmacopoeials error:", error);
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
    const { id, pharmacopoeial, description, companyId, locationId } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Pharmacopoeial ID is required" },
        { status: 400 }
      );
    }

    if (!pharmacopoeial?.trim()) {
      return NextResponse.json(
        { success: false, error: "Pharmacopoeial is required" },
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

    // Get the existing pharmacopoeial for comparison
    const existingPharmacopoeial = await Pharmacopoeial.findOne({
      _id: id,
      companyId,
      locationId,
    });

    if (!existingPharmacopoeial) {
      return NextResponse.json(
        { success: false, error: "Pharmacopoeial not found" },
        { status: 404 }
      );
    }

    // Check if the new name conflicts with another pharmacopoeial
    const duplicatePharmacopoeial = await Pharmacopoeial.findOne({
      pharmacopoeial: pharmacopoeial.trim(),
      companyId,
      locationId,
      _id: { $ne: id },
    });

    if (duplicatePharmacopoeial) {
      return NextResponse.json(
        { success: false, error: "Pharmacopoeial name already exists" },
        { status: 409 }
      );
    }

    // Update the pharmacopoeial
    const updatedPharmacopoeial = await Pharmacopoeial.findByIdAndUpdate(
      id,
      {
        pharmacopoeial: pharmacopoeial.trim(),
        description: description?.trim() || "",
        updatedBy: session.user?.id || "system",
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedPharmacopoeial) {
      return NextResponse.json(
        { success: false, error: "Failed to update Pharmacopoeial" },
        { status: 500 }
      );
    }

    // Broadcast the update event to SSE clients
    broadcastMasterDataUpdate(
      "pharmacopoeials",
      updatedPharmacopoeial.toObject(),
      companyId,
      locationId
    );

    return NextResponse.json({
      success: true,
      data: updatedPharmacopoeial,
      message: "Pharmacopoeial updated successfully",
    });
  } catch (error: any) {
    console.error("Update pharmacopoeial error:", error);
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
        { success: false, error: "Pharmacopoeial ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get the pharmacopoeial before deleting for broadcasting
    const pharmacopoeialToDelete = await Pharmacopoeial.findById(id);

    if (!pharmacopoeialToDelete) {
      return NextResponse.json(
        { success: false, error: "Pharmacopoeial not found" },
        { status: 404 }
      );
    }

    // Delete the pharmacopoeial
    const deletedPharmacopoeial = await Pharmacopoeial.findByIdAndDelete(id);

    if (!deletedPharmacopoeial) {
      return NextResponse.json(
        { success: false, error: "Failed to delete Pharmacopoeial" },
        { status: 500 }
      );
    }

    // Broadcast the delete event to SSE clients
    broadcastMasterDataDelete(
      "pharmacopoeials",
      deletedPharmacopoeial.toObject(),
      pharmacopoeialToDelete.companyId,
      pharmacopoeialToDelete.locationId
    );

    return NextResponse.json({
      success: true,
      message: "Pharmacopoeial deleted successfully",
      data: deletedPharmacopoeial,
    });
  } catch (error: any) {
    console.error("Delete pharmacopoeial error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}