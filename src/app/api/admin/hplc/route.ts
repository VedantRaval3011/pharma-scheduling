import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import HPLC from '@/models/hplc';
import DetectorType from '@/models/detectorType';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { broadcastMasterDataCreate, broadcastMasterDataUpdate, broadcastMasterDataDelete } from "@/lib/sse";

// Helper function to validate HPLC data
function validateHPLCData(data: any) {
  const errors: string[] = [];
  
  if (!data.type) {
    errors.push('HPLC/UPLC type is required');
  } else if (!['HPLC', 'UPLC'].includes(data.type)) {
    errors.push('Type must be either HPLC or UPLC');
  }
  
  if (!data.detector || !Array.isArray(data.detector) || data.detector.length === 0) {
    errors.push('At least one detector is required');
  } else {
    // Ensure all detector IDs are valid ObjectIds
    const invalidIds = data.detector.filter((id: any) => !mongoose.isValidObjectId(id));
    if (invalidIds.length > 0) {
      errors.push('All detector IDs must be valid ObjectIds');
    }
  }
  
  if (!data.internalCode) {
    errors.push('Internal code is required');
  } else if (typeof data.internalCode !== 'string') {
    errors.push('Internal code must be a string');
  } else if (data.internalCode.trim().length === 0) {
    errors.push('Internal code cannot be empty');
  } else if (data.internalCode.trim().length > 50) {
    errors.push('Internal code cannot exceed 50 characters');
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
  
  if (typeof data.isActive !== 'boolean') {
    errors.push('Active status must be a boolean');
  }
  
  return errors;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, detector, internalCode, isActive, companyId, locationId } = body;

    // Validate input data
    const validationErrors = validateHPLCData({ type, detector, internalCode, isActive, companyId, locationId });
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: validationErrors.join(', '), validationErrors },
        { status: 400 }
      );
    }

    // Check if all detectors exist
    const detectorsExist = await DetectorType.find({ _id: { $in: detector } });
    if (detectorsExist.length !== detector.length) {
      return NextResponse.json(
        { success: false, error: 'One or more detector types not found' },
        { status: 404 }
      );
    }

    // Check for existing HPLC
    const existingHPLC = await HPLC.findOne({ internalCode: internalCode.trim(), companyId, locationId });
    if (existingHPLC) {
      return NextResponse.json(
        { success: false, error: 'HPLC with this internal code already exists' },
        { status: 409 }
      );
    }

    // Create new HPLC
    const newHPLC = new HPLC({
      type: type.trim(),
      detector,
      internalCode: internalCode.trim(),
      isActive,
      companyId,
      locationId,
      createdBy: session.user?.id || "system",
      updatedBy: session.user?.id || "system",
    });
    
    const savedHPLC = await newHPLC.save();

    // Broadcast the create event to SSE clients
    broadcastMasterDataCreate("hplcs", savedHPLC.toObject(), companyId, locationId);
    
    return NextResponse.json({
      success: true,
      data: savedHPLC,
      message: "HPLC created successfully",
    });
  } catch (error: any) {
    console.error("Create HPLC error:", error);
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

    const hplcs = await HPLC.find({ companyId, locationId })
      .populate('detector', 'detectorType')
      .sort({ internalCode: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: hplcs,
    });
  } catch (error: any) {
    console.error("Fetch HPLCs error:", error);
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
    const { id, type, detector, internalCode, isActive, companyId, locationId } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "HPLC ID is required" },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { success: false, error: "Type is required" },
        { status: 400 }
      );
    }

    if (!companyId || !locationId) {
      return NextResponse.json(
        { success: false, error: "Company ID and Location ID are required" },
        { status: 400 }
      );
    }

    // Ensure detector is an array
    const detectorArray = Array.isArray(detector) ? detector : [detector].filter(Boolean);

    // Validate input data with normalized detector array
    const validationErrors = validateHPLCData({ 
      type, 
      detector: detectorArray, 
      internalCode, 
      isActive, 
      companyId, 
      locationId 
    });
    
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: validationErrors.join(', '), validationErrors },
        { status: 400 }
      );
    }

    // Check if all detectors exist
    if (detectorArray.length > 0) {
      const detectorsExist = await DetectorType.find({ _id: { $in: detectorArray } });
      if (detectorsExist.length !== detectorArray.length) {
        return NextResponse.json(
          { success: false, error: 'One or more detector types not found' },
          { status: 404 }
        );
      }
    }

    await connectDB();

    // Get the existing HPLC for comparison
    const existingHPLC = await HPLC.findOne({
      _id: id,
      companyId,
      locationId,
    });

    if (!existingHPLC) {
      return NextResponse.json(
        { success: false, error: "HPLC not found" },
        { status: 404 }
      );
    }

    // Check if the new internal code conflicts with another HPLC
    const duplicateHPLC = await HPLC.findOne({
      internalCode: internalCode.trim(),
      companyId,
      locationId,
      _id: { $ne: id },
    });

    if (duplicateHPLC) {
      return NextResponse.json(
        { success: false, error: "HPLC with this internal code already exists" },
        { status: 409 }
      );
    }

    // Update HPLC with normalized detector array
    const updateData: any = {
      type: type.trim(),
      detector: detectorArray,
      internalCode: internalCode.trim(),
      isActive,
      updatedBy: session.user?.id || "system",
      updatedAt: new Date(),
    };

    // Use findOneAndUpdate instead of findByIdAndUpdate for better error handling
    const updatedHPLC = await HPLC.findOneAndUpdate(
      { _id: id }, 
      updateData, 
      { 
        new: true, 
        runValidators: true,
        context: 'query' // This helps with array validation
      }
    );

    if (!updatedHPLC) {
      return NextResponse.json(
        { success: false, error: "Failed to update HPLC" },
        { status: 500 }
      );
    }

    // Broadcast the update event to SSE clients
    broadcastMasterDataUpdate("hplcs", updatedHPLC.toObject(), companyId, locationId);

    return NextResponse.json({
      success: true,
      data: updatedHPLC,
      message: "HPLC updated successfully",
    });
  } catch (error: any) {
    console.error("Update HPLC error:", error);
    
    // More detailed error logging
    if (error.name === 'ValidationError') {
      console.error("Validation errors:", error.errors);
      const validationMessages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { 
          success: false, 
          error: `Validation failed: ${validationMessages.join(', ')}`,
          validationErrors: validationMessages
        },
        { status: 400 }
      );
    }
    
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
        { success: false, error: "HPLC ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get the HPLC before deleting for broadcasting
    const hplcToDelete = await HPLC.findById(id);

    if (!hplcToDelete) {
      return NextResponse.json(
        { success: false, error: "HPLC not found" },
        { status: 404 }
      );
    }

    // Delete the HPLC
    const deletedHPLC = await HPLC.findByIdAndDelete(id);

    if (!deletedHPLC) {
      return NextResponse.json(
        { success: false, error: "Failed to delete HPLC" },
        { status: 500 }
      );
    }

    // Broadcast the delete event to SSE clients
    broadcastMasterDataDelete("hplcs", deletedHPLC.toObject(), hplcToDelete.companyId, hplcToDelete.locationId);

    return NextResponse.json({
      success: true,
      message: "HPLC deleted successfully",
      data: deletedHPLC,
    });
  } catch (error: any) {
    console.error("Delete HPLC error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}