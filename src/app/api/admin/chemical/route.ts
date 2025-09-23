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
  
  // Enhanced desc validation with debugging
  if (data.desc !== undefined && data.desc !== null) {
    if (typeof data.desc !== 'string') {
      errors.push('Description must be a string');
    } else if (data.desc.length > 500) {
      errors.push('Description cannot exceed 500 characters');
    }
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
    console.log("POST: Received body:", JSON.stringify(body, null, 2));
    
    const { chemicalName, isSolvent, isBuffer, desc, companyId, locationId } = body;
    
    // Enhanced logging for description field
    console.log("POST: Description field debug:", {
      desc: desc,
      descType: typeof desc,
      descLength: desc ? desc.length : 'null/undefined',
      descTrimmed: desc ? desc.trim() : 'null/undefined'
    });

    // Validate input data
    const validationErrors = validateChemicalData({ chemicalName, isSolvent, isBuffer, desc, companyId, locationId });
    if (validationErrors.length > 0) {
      console.error("POST: Validation errors:", validationErrors);
      return NextResponse.json(
        { success: false, error: validationErrors.join(', '), validationErrors },
        { status: 400 }
      );
    }

    // Check for existing Chemical
    const existingChemical = await Chemical.findOne({ 
      chemicalName: chemicalName.trim(), 
      companyId, 
      locationId 
    });
    if (existingChemical) {
      console.error("POST: Chemical already exists", { chemicalName, companyId, locationId });
      return NextResponse.json(
        { success: false, error: 'Chemical already exists' },
        { status: 409 }
      );
    }

    // Prepare chemical data with explicit desc handling
    const chemicalData = {
      chemicalName: chemicalName.trim(),
      isSolvent,
      isBuffer,
      desc: desc ? desc.trim() : '', // Ensure desc is always a string
      companyId,
      locationId,
      createdBy: session.user?.id || "system"
    };
    
    console.log("POST: Chemical data to be saved:", JSON.stringify(chemicalData, null, 2));

    // Create new Chemical
    const newChemical = new Chemical(chemicalData);
    
    console.log("POST: Chemical object before save:", JSON.stringify(newChemical.toObject(), null, 2));
    const savedChemical = await newChemical.save();
    console.log("POST: Chemical object after save:", JSON.stringify(savedChemical.toObject(), null, 2));

    // Broadcast the create event to SSE clients
    broadcastMasterDataCreate(
      "chemicals",
      savedChemical.toObject(),
      companyId,
      locationId
    );
    
    console.log("POST: Chemical saved successfully with desc:", savedChemical.desc);
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
    console.log("PUT: Received body:", JSON.stringify(body, null, 2));
    
    const { id, chemicalName, isSolvent, isBuffer, desc, companyId, locationId } = body;
    
    // Enhanced logging for description field
    console.log("PUT: Description field debug:", {
      desc: desc,
      descType: typeof desc,
      descLength: desc ? desc.length : 'null/undefined',
      descTrimmed: desc ? desc.trim() : 'null/undefined'
    });

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

    // Prepare update data with explicit desc handling
    const updateData = {
      chemicalName: chemicalName.trim(),
      isSolvent,
      isBuffer,
      desc: desc ? desc.trim() : '', // Ensure desc is always a string
      updatedBy: session.user?.id || "system",
      updatedAt: new Date(),
    };
    
    console.log("PUT: Update data:", JSON.stringify(updateData, null, 2));

    // Update the Chemical
    const updatedChemical = await Chemical.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedChemical) {
      console.error("PUT: Failed to update Chemical", { id });
      return NextResponse.json(
        { success: false, error: "Failed to update Chemical" },
        { status: 500 }
      );
    }

    console.log("PUT: Updated chemical with desc:", updatedChemical.desc);

    // Broadcast the update event to SSE clients
    broadcastMasterDataUpdate(
      "chemicals",
      updatedChemical.toObject(),
      companyId,
      locationId
    );

    console.log("PUT: Chemical updated successfully:", JSON.stringify(updatedChemical.toObject(), null, 2));
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

// GET and DELETE methods remain the same...
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

    // Enhanced logging to check desc field in retrieved data
    console.log("GET: Sample chemical with desc:", chemicals[0] ? {
      name: chemicals[0].chemicalName,
      desc: chemicals[0].desc,
      descType: typeof chemicals[0].desc
    } : "No chemicals found");

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