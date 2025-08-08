import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import TestType from '@/models/test-type';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper function to validate Test Type data
function validateTestTypeData(data: any) {
  const errors: string[] = [];
  if (!data.testType) {
    errors.push('Test Type name is required');
  } else if (typeof data.testType !== 'string') {
    errors.push('Test Type name must be a string');
  } else if (data.testType.trim().length === 0) {
    errors.push('Test Type name cannot be empty');
  } else if (data.testType.trim().length > 100) {
    errors.push('Test Type name cannot exceed 100 characters');
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
    const { testType, description, companyId, locationId } = body;

    // Validate input data
    const validationErrors = validateTestTypeData({ testType, description, companyId, locationId });
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

    // Check for existing test type
    const existingTestType = await TestType.findOne({ testType, companyId, locationId });
    if (existingTestType) {
      return NextResponse.json(
        { success: false, error: 'Test Type already exists for this company and location' },
        { status: 400 }
      );
    }

    // Create new test type
    const testTypeData = {
      testType: testType.trim(),
      description: description?.trim() || '',
      companyId: companyId.trim(),
      locationId: locationId.trim(),
      createdBy: session.user.userId || session.user.id,
    };
    
    const newTestType = new TestType(testTypeData);
    const savedTestType = await newTestType.save();
    
    return NextResponse.json(
      { success: true, data: savedTestType },
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

    const testTypes = await TestType.find({ companyId, locationId }).sort({ testType: 1 }).lean();
    
    return NextResponse.json({ success: true, data: testTypes }, { status: 200 });
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
    const { id, testType, description, companyId, locationId } = body;

    // Validate input data
    const validationErrors = validateTestTypeData({ testType, description, companyId, locationId });
    if (!id) {
      validationErrors.push('Test Type ID is required');
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

    // Find the existing test type
    const existingTestType = await TestType.findById(id);
    if (!existingTestType) {
      return NextResponse.json(
        { success: false, error: 'Test Type not found' },
        { status: 404 }
      );
    }

    // Verify that companyId and locationId match the existing document
    if (existingTestType.companyId !== companyId || existingTestType.locationId !== locationId) {
      return NextResponse.json(
        { success: false, error: 'Company ID or Location ID does not match the existing test type' },
        { status: 403 }
      );
    }

    // Check for duplicate test type (excluding the current test type)
    const duplicateTestType = await TestType.findOne({
      testType,
      companyId,
      locationId,
      _id: { $ne: id }
    });

    if (duplicateTestType) {
      return NextResponse.json(
        { success: false, error: 'Test Type already exists for this company and location' },
        { status: 400 }
      );
    }

    // Update the test type
    const updateData = {
      testType: testType.trim(),
      description: description?.trim() || '',
      updatedAt: new Date(),
    };
    
    const updatedTestType = await TestType.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedTestType) {
      return NextResponse.json(
        { success: false, error: 'Failed to update test type' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data: updatedTestType },
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
        { success: false, error: 'Test Type ID is required' },
        { status: 400 }
      );
    }

    const testType = await TestType.findById(id);
    if (!testType) {
      return NextResponse.json(
        { success: false, error: 'Test Type not found' },
        { status: 404 }
      );
    }

    // Validate companyId and locationId against session
    if (!validateCompanyAndLocation(session, testType.companyId, testType.locationId)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized company or location access' },
        { status: 403 }
      );
    }

    await TestType.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Test Type deleted successfully',
      deletedTestType: { id: testType._id, testType: testType.testType },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}