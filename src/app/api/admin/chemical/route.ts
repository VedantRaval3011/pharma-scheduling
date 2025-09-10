import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Chemical from '@/models/chemical/chemical';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  broadcastMasterDataCreate,
  broadcastMasterDataUpdate,
  broadcastMasterDataDelete 
} from "@/lib/sse";

// Helper function to validate Chemical data
function validateChemicalData(data: any) {
  const errors: string[] = [];
  if (!data.chemicalName) {
    errors.push('Chemical name is required');
  } else if (typeof data.chemicalName !== 'string') {
    errors.push('Chemical name must be a string');
  } else if (data.chemicalName.trim().length === 0) {
    errors.push('Chemical name cannot be empty');
  } else if (data.chemicalName.trim().length > 100) {
    errors.push('Chemical name cannot exceed 100 characters');
  }
  if (typeof data.isSolvent !== 'boolean') {
    errors.push('isSolvent must be a boolean');
  }
  if (typeof data.isBuffer !== 'boolean') {
    errors.push('isBuffer must be a boolean');
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
  return true; // Simplified validation, implement as needed
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session) {
      console.error("POST: Unauthorized - no session");
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log("POST: Received body:", body);
    const { chemicalName, isSolvent, isBuffer, description, companyId, locationId } = body;

    // Validate input data
    const validationErrors = validateChemicalData({ chemicalName, isSolvent, isBuffer, description, companyId, locationId });
    if (validationErrors.length > 0) {
      console.error("POST: Validation errors:", validationErrors);
      return NextResponse.json(
        { success: false, error: validationErrors.join(', '), validationErrors },
        { status: 400 }
      );
    }

    // Check for existing Chemical
    const existingChemical = await Chemical.findOne({ chemicalName: chemicalName.trim(), companyId, locationId });
    if (existingChemical) {
      console.error("POST: Chemical already exists", { chemicalName, companyId, locationId });
      return NextResponse.json(
        { success: false, error: 'Chemical already exists' },
        { status: 409 }
      );
    }

    // Create new Chemical
    const newChemical = new Chemical({
      chemicalName: chemicalName.trim(),
      isSolvent,
      isBuffer,
      description: description?.trim() || '',
      companyId,
      locationId,
      createdBy: session.user?.id || "system",
      updatedBy: session.user?.id || "system",
    });
    
    console.log("POST: Creating Chemical:", newChemical);
    const savedChemical = await newChemical.save();

    // Broadcast the create event to SSE clients
    broadcastMasterDataCreate(
      "chemicals",
      savedChemical.toObject(),
      companyId,
      locationId
    );
    
    console.log("POST: Chemical saved successfully:", savedChemical);
    return NextResponse.json({
      success: true,
      data: savedChemical,
      message: "Chemical created successfully",
    });
  } catch (error: any) {
    console.error("POST: Server error:", error);
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

    const chemicals = await Chemical.find({ companyId, locationId })
      .sort({ chemicalName: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: chemicals,
    });
  } catch (error: any) {
    console.error("Fetch Chemicals error:", error);
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
      console.error("PUT: Unauthorized - no session");
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log("PUT: Received body:", body);
    const { id, chemicalName, isSolvent, isBuffer, description, companyId, locationId } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Chemical ID is required" },
        { status: 400 }
      );
    }

    if (!chemicalName?.trim()) {
      return NextResponse.json(
        { success: false, error: "Chemical name is required" },
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

    // Get the existing Chemical for comparison
    const existingChemical = await Chemical.findOne({
      _id: id,
      companyId,
      locationId,
    });

    if (!existingChemical) {
      console.error("PUT: Chemical not found", { id });
      return NextResponse.json(
        { success: false, error: "Chemical not found" },
        { status: 404 }
      );
    }

    // Check if the new name conflicts with another Chemical
    const duplicateChemical = await Chemical.findOne({
      chemicalName: chemicalName.trim(),
      companyId,
      locationId,
      _id: { $ne: id },
    });

    if (duplicateChemical) {
      console.error("PUT: Chemical already exists", { chemicalName, companyId, locationId });
      return NextResponse.json(
        { success: false, error: "Chemical name already exists" },
        { status: 409 }
      );
    }

    // Update the Chemical
    const updatedChemical = await Chemical.findByIdAndUpdate(
      id,
      {
        chemicalName: chemicalName.trim(),
        isSolvent,
        isBuffer,
        description: description?.trim() || "",
        updatedBy: session.user?.id || "system",
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedChemical) {
      console.error("PUT: Failed to update Chemical", { id });
      return NextResponse.json(
        { success: false, error: "Failed to update Chemical" },
        { status: 500 }
      );
    }

    // Broadcast the update event to SSE clients
    broadcastMasterDataUpdate(
      "chemicals",
      updatedChemical.toObject(),
      companyId,
      locationId
    );

    console.log("PUT: Chemical updated successfully:", updatedChemical);
    return NextResponse.json({
      success: true,
      data: updatedChemical,
      message: "Chemical updated successfully",
    });
  } catch (error: any) {
    console.error("PUT: Server error:", error);
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
        { success: false, error: "Chemical ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get the Chemical before deleting for broadcasting
    const chemicalToDelete = await Chemical.findById(id);

    if (!chemicalToDelete) {
      return NextResponse.json(
        { success: false, error: "Chemical not found" },
        { status: 404 }
      );
    }

    // Delete the Chemical
    const deletedChemical = await Chemical.findByIdAndDelete(id);

    if (!deletedChemical) {
      return NextResponse.json(
        { success: false, error: "Failed to delete Chemical" },
        { status: 500 }
      );
    }

    // Broadcast the delete event to SSE clients
    broadcastMasterDataDelete(
      "chemicals",
      deletedChemical.toObject(),
      chemicalToDelete.companyId,
      chemicalToDelete.locationId
    );

    return NextResponse.json({
      success: true,
      message: "Chemical deleted successfully",
      data: deletedChemical,
    });
  } catch (error: any) {
    console.error("Delete Chemical error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}