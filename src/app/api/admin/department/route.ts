import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Department from '@/models/department';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
  return errors;
}

// Helper function to validate companyId and locationId against session
function validateCompanyAndLocation(session: any, companyId: string, locationId: string) {
  const company = session?.user?.companies.find((c: any) => c.companyId === companyId);
  if (!company) {
    return false;
  }
  return company.locations.some((l: any) => l.locationId === locationId);
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.companies?.length) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized or no company assigned' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { department, description, companyId, locationId } = body;

    // Validate input data
    const validationErrors = validateDepartmentData({ department, description, companyId, locationId });
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: validationErrors.join(', '), validationErrors },
        { status: 400 }
      );
    }

    // Validate companyId and locationId against session
    const isValidCompanyLocation = validateCompanyAndLocation(session, companyId, locationId);
    if (!isValidCompanyLocation) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized company or location access' },
        { status: 403 }
      );
    }

    // Check for existing department
    const existingDepartment = await Department.findOne({ department, companyId, locationId });
    if (existingDepartment) {
      return NextResponse.json(
        { success: false, error: 'Department already exists for this company and location' },
        { status: 400 }
      );
    }

    // Create new department
    const departmentData = {
      department: department.trim(),
      description: description?.trim() || '',
      companyId: companyId.trim(),
      locationId: locationId.trim(),
      createdBy: session.user.userId || session.user.id,
    };
    
    const newDepartment = new Department(departmentData);
    const savedDepartment = await newDepartment.save();
    
    return NextResponse.json(
      { success: true, data: savedDepartment },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.companies?.length) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized or no company assigned' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const locationId = searchParams.get('locationId');

    if (!companyId || !locationId) {
      return NextResponse.json(
        { success: false, error: 'Company ID and location ID are required' },
        { status: 400 }
      );
    }

    // Validate companyId and locationId against session
    const isValidCompanyLocation = validateCompanyAndLocation(session, companyId, locationId);
    if (!isValidCompanyLocation) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized company or location access' },
        { status: 403 }
      );
    }

    const departments = await Department.find({ companyId, locationId }).sort({ department: 1 }).lean();
    
    return NextResponse.json({ success: true, data: departments }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.companies?.length) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized or no company assigned' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, department, description, companyId, locationId } = body;

    // Validate input data
    const validationErrors = validateDepartmentData({ department, description, companyId, locationId });
    if (!id) {
      validationErrors.push('Department ID is required');
    }
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: validationErrors.join(', '), validationErrors },
        { status: 400 }
      );
    }

    // Validate companyId and locationId against session
    const isValidCompanyLocation = validateCompanyAndLocation(session, companyId, locationId);
    if (!isValidCompanyLocation) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized company or location access' },
        { status: 403 }
      );
    }

    // Find the existing department
    const existingDepartment = await Department.findById(id);
    if (!existingDepartment) {
      return NextResponse.json(
        { success: false, error: 'Department not found' },
        { status: 404 }
      );
    }

    // Verify that companyId and locationId match the existing document
    if (existingDepartment.companyId !== companyId || existingDepartment.locationId !== locationId) {
      return NextResponse.json(
        { success: false, error: 'Company ID or Location ID does not match the existing department' },
        { status: 403 }
      );
    }

    // Check for duplicate department (excluding the current department)
    const duplicateDepartment = await Department.findOne({
      department,
      companyId,
      locationId,
      _id: { $ne: id }
    });

    if (duplicateDepartment) {
      return NextResponse.json(
        { success: false, error: 'Department already exists for this company and location' },
        { status: 400 }
      );
    }

    // Update the department
    const updateData = {
      department: department.trim(),
      description: description?.trim() || '',
      updatedAt: new Date(),
    };
    
    const updatedDepartment = await Department.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedDepartment) {
      return NextResponse.json(
        { success: false, error: 'Failed to update department' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data: updatedDepartment },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.companies?.length) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized or no company assigned' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Department ID is required' },
        { status: 400 }
      );
    }

    const department = await Department.findById(id);
    if (!department) {
      return NextResponse.json(
        { success: false, error: 'Department not found' },
        { status: 404 }
      );
    }

    // Validate companyId and locationId against session
    if (!validateCompanyAndLocation(session, department.companyId, department.locationId)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized company or location access' },
        { status: 403 }
      );
    }

    await Department.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Department deleted successfully',
      deletedDepartment: { id: department._id, department: department.department },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}