// /api/admin/detector-type/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import DetectorType from '@/models/detectorType';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
    const { detectorType, description, companyId, locationId } = body;

    // Validate input data
    const validationErrors = validateDetectorTypeData({ detectorType, description, companyId, locationId });
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

    // Check for existing detectorType
    const existingDetectorType = await DetectorType.findOne({ detectorType, companyId, locationId });
    if (existingDetectorType) {
      return NextResponse.json(
        { success: false, error: 'Detector type already exists for this company and location' },
        { status: 400 }
      );
    }

    // Create new detectorType
    const detectorTypeData = {
      detectorType: detectorType.trim(),
      description: description?.trim() || '',
      companyId: companyId.trim(),
      locationId: locationId.trim(),
      createdBy: session.user.userId || session.user.id,
    };
   
    const newDetectorType = new DetectorType(detectorTypeData);
    const savedDetectorType = await newDetectorType.save();
   
    return NextResponse.json(
      { success: true, data: savedDetectorType },
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

    const detectorTypes = await DetectorType.find({ companyId, locationId }).sort({ detectorType: 1 }).lean();
   
    return NextResponse.json({ success: true, data: detectorTypes }, { status: 200 });
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
    const { id, detectorType, description, companyId, locationId } = body;

    // Validate input data
    const validationErrors = validateDetectorTypeData({ detectorType, description, companyId, locationId });
    if (!id) {
      validationErrors.push('Detector type ID is required');
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

    // Find the existing detectorType
    const existingDetectorType = await DetectorType.findById(id);
    if (!existingDetectorType) {
      return NextResponse.json(
        { success: false, error: 'Detector type not found' },
        { status: 404 }
      );
    }

    // Verify that companyId and locationId match the existing document
    if (existingDetectorType.companyId !== companyId || existingDetectorType.locationId !== locationId) {
      return NextResponse.json(
        { success: false, error: 'Company ID or Location ID does not match the existing detector type' },
        { status: 403 }
      );
    }

    // Check for duplicate detectorType (excluding the current detectorType)
    const duplicateDetectorType = await DetectorType.findOne({
      detectorType,
      companyId,
      locationId,
      _id: { $ne: id }
    });

    if (duplicateDetectorType) {
      return NextResponse.json(
        { success: false, error: 'Detector type already exists for this company and location' },
        { status: 400 }
      );
    }

    // Update the detectorType
    const updateData = {
      detectorType: detectorType.trim(),
      description: description?.trim() || '',
      updatedAt: new Date(),
    };
   
    const updatedDetectorType = await DetectorType.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
   
    if (!updatedDetectorType) {
      return NextResponse.json(
        { success: false, error: 'Failed to update detector type' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data: updatedDetectorType },
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
        { success: false, error: 'Detector type ID is required' },
        { status: 400 }
      );
    }

    const detectorType = await DetectorType.findById(id);
    if (!detectorType) {
      return NextResponse.json(
        { success: false, error: 'Detector type not found' },
        { status: 404 }
      );
    }

    // Validate companyId and locationId against session
    if (!validateCompanyAndLocation(session, detectorType.companyId, detectorType.locationId)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized company or location access' },
        { status: 403 }
      );
    }

    await DetectorType.findByIdAndDelete(id);
   
    return NextResponse.json({
      success: true,
      message: 'Detector type deleted successfully',
      deletedDetectorType: { id: detectorType._id, detectorType: detectorType.detectorType },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

