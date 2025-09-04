import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Department from '@/models/department';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  broadcastMasterDataCreate,
  broadcastMasterDataUpdate,
  broadcastMasterDataDelete 
} from "@/lib/sse";

// Helper function to validate Department data
function validateDepartmentData(data: any) {
  const errors: string[] = [];
  if (!data.department) {
    errors.push('Department name is required');
  } else if (typeof data.department !== 'string') {
    errors.push('Department name must be a string');
  } else if (data.department.trim().length === 0) {
    errors.push('Department name cannot be empty');
  } else if (data.department.trim().length > 100) {
    errors.push('Department name cannot exceed 100 characters');
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
  if (data.daysOfUrgency !== undefined && data.daysOfUrgency !== null) {
    if (typeof data.daysOfUrgency !== 'number') {
      errors.push('Days of urgency must be a number');
    } else if (!Number.isInteger(data.daysOfUrgency)) {
      errors.push('Days of urgency must be an integer');
    } else if (data.daysOfUrgency < 0) {
      errors.push('Days of urgency cannot be negative');
    } else if (data.daysOfUrgency > 30) {
      errors.push('Days of urgency cannot exceed 30 days');
    }
  }
  return errors;
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
    const { department, description, companyId, locationId, daysOfUrgency } = body;

    // Validate input data
    const validationErrors = validateDepartmentData({ department, description, companyId, locationId, daysOfUrgency });
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: validationErrors.join(', '), validationErrors },
        { status: 400 }
      );
    }

    // Check for existing department
    const existingDepartment = await Department.findOne({ department: department.trim(), companyId, locationId });
    if (existingDepartment) {
      return NextResponse.json(
        { success: false, error: 'Department already exists' },
        { status: 409 }
      );
    }

    // Create new department
    const newDepartment = new Department({
      department: department.trim(),
      description: description?.trim() || '',
      companyId,
      locationId,
      daysOfUrgency: daysOfUrgency !== undefined && daysOfUrgency !== null ? Number(daysOfUrgency) : 0,
      createdBy: session.user?.id || "system",
      updatedBy: session.user?.id || "system",
    });
    
    const savedDepartment = await newDepartment.save();

    // Broadcast the create event to SSE clients
    broadcastMasterDataCreate(
      "departments",
      savedDepartment.toObject(),
      companyId,
      locationId
    );
    
    return NextResponse.json({
      success: true,
      data: savedDepartment,
      message: "Department created successfully",
    });
  } catch (error: any) {
    console.error("Create department error:", error);
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

    const departments = await Department.find({ companyId, locationId })
      .sort({ department: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: departments,
    });
  } catch (error: any) {
    console.error("Fetch departments error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// FIXED PUT REQUEST
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
    const { id, department, description, companyId, locationId, daysOfUrgency } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Department ID is required" },
        { status: 400 }
      );
    }

    if (!department?.trim()) {
      return NextResponse.json(
        { success: false, error: "Department is required" },
        { status: 400 }
      );
    }

    if (!companyId || !locationId) {
      return NextResponse.json(
        { success: false, error: "Company ID and Location ID are required" },
        { status: 400 }
      );
    }

    // Validate input data
    const validationErrors = validateDepartmentData({ department, description, companyId, locationId, daysOfUrgency });
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: validationErrors.join(', '), validationErrors },
        { status: 400 }
      );
    }

    await connectDB();

    // Get the existing department for comparison
    const existingDepartment = await Department.findOne({
      _id: id,
      companyId,
      locationId,
    });

    if (!existingDepartment) {
      return NextResponse.json(
        { success: false, error: "Department not found" },
        { status: 404 }
      );
    }

    // Check if the new name conflicts with another department
    const duplicateDepartment = await Department.findOne({
      department: department.trim(),
      companyId,
      locationId,
      _id: { $ne: id },
    });

    if (duplicateDepartment) {
      return NextResponse.json(
        { success: false, error: "Department name already exists" },
        { status: 409 }
      );
    }

    // FIXED: Always include daysOfUrgency in the update
    const updateData: any = {
      department: department.trim(),
      description: description?.trim() || "",
      daysOfUrgency: daysOfUrgency !== undefined && daysOfUrgency !== null && daysOfUrgency !== ''
        ? Number(daysOfUrgency)
        : 0,
      updatedBy: session.user?.id || "system",
      updatedAt: new Date(),
    };

    const updatedDepartment = await Department.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedDepartment) {
      return NextResponse.json(
        { success: false, error: "Failed to update Department" },
        { status: 500 }
      );
    }

    // Broadcast the update event to SSE clients
    broadcastMasterDataUpdate(
      "departments",
      updatedDepartment.toObject(),
      companyId,
      locationId
    );

    return NextResponse.json({
      success: true,
      data: updatedDepartment,
      message: "Department updated successfully",
    });
  } catch (error: any) {
    console.error("Update department error:", error);
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
        { success: false, error: "Department ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get the department before deleting for broadcasting
    const departmentToDelete = await Department.findById(id);

    if (!departmentToDelete) {
      return NextResponse.json(
        { success: false, error: "Department not found" },
        { status: 404 }
      );
    }

    // Delete the department
    const deletedDepartment = await Department.findByIdAndDelete(id);

    if (!deletedDepartment) {
      return NextResponse.json(
        { success: false, error: "Failed to delete Department" },
        { status: 500 }
      );
    }

    // Broadcast the delete event to SSE clients
    broadcastMasterDataDelete(
      "departments",
      deletedDepartment.toObject(),
      departmentToDelete.companyId,
      departmentToDelete.locationId
    );

    return NextResponse.json({
      success: true,
      message: "Department deleted successfully",
      data: deletedDepartment,
    });
  } catch (error: any) {
    console.error("Delete department error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}