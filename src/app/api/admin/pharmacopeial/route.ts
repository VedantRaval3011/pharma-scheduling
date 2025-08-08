import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Pharmacopeial from '@/models/pharmacopeial';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper function to validate Pharmacopeial data
function validatePharmacopeialData(data: any) {
  const errors: string[] = [];
  if (!data.pharmacopeial) {
    errors.push('Pharmacopeial name is required');
  } else if (typeof data.pharmacopeial !== 'string') {
    errors.push('Pharmacopeial name must be a string');
  } else if (data.pharmacopeial.trim().length === 0) {
    errors.push('Pharmacopeial name cannot be empty');
  } else if (data.pharmacopeial.trim().length > 100) {
    errors.push('Pharmacopeial name cannot exceed 100 characters');
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
    const { pharmacopeial, description, companyId, locationId } = body;

    // Validate input data
    const validationErrors = validatePharmacopeialData({ pharmacopeial, description, companyId, locationId });
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

    // Check for existing pharmacopeial
    const existingPharmacopeial = await Pharmacopeial.findOne({ pharmacopeial, companyId, locationId });
    if (existingPharmacopeial) {
      return NextResponse.json(
        { success: false, error: 'Pharmacopeial already exists for this company and location' },
        { status: 400 }
      );
    }

    // Create new pharmacopeial
    const pharmacopeialData = {
      pharmacopeial: pharmacopeial.trim(),
      description: description?.trim() || '',
      companyId: companyId.trim(),
      locationId: locationId.trim(),
      createdBy: session.user.userId || session.user.id,
    };
    
    const newPharmacopeial = new Pharmacopeial(pharmacopeialData);
    const savedPharmacopeial = await newPharmacopeial.save();
    
    return NextResponse.json(
      { success: true, data: savedPharmacopeial },
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

    const pharmacopeials = await Pharmacopeial.find({ companyId, locationId }).sort({ pharmacopeial: 1 }).lean();
    
    return NextResponse.json({ success: true, data: pharmacopeials }, { status: 200 });
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
    const { id, pharmacopeial, description, companyId, locationId } = body;

    // Validate input data
    const validationErrors = validatePharmacopeialData({ pharmacopeial, description, companyId, locationId });
    if (!id) {
      validationErrors.push('Pharmacopeial ID is required');
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

    // Find the existing pharmacopeial
    const existingPharmacopeial = await Pharmacopeial.findById(id);
    if (!existingPharmacopeial) {
      return NextResponse.json(
        { success: false, error: 'Pharmacopeial not found' },
        { status: 404 }
      );
    }

    // Verify that companyId and locationId match the existing document
    if (existingPharmacopeial.companyId !== companyId || existingPharmacopeial.locationId !== locationId) {
      return NextResponse.json(
        { success: false, error: 'Company ID or Location ID does not match the existing pharmacopeial' },
        { status: 403 }
      );
    }

    // Check for duplicate pharmacopeial (excluding the current pharmacopeial)
    const duplicatePharmacopeial = await Pharmacopeial.findOne({
      pharmacopeial,
      companyId,
      locationId,
      _id: { $ne: id }
    });

    if (duplicatePharmacopeial) {
      return NextResponse.json(
        { success: false, error: 'Pharmacopeial already exists for this company and location' },
        { status: 400 }
      );
    }

    // Update the pharmacopeial
    const updateData = {
      pharmacopeial: pharmacopeial.trim(),
      description: description?.trim() || '',
      updatedAt: new Date(),
    };
    
    const updatedPharmacopeial = await Pharmacopeial.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedPharmacopeial) {
      return NextResponse.json(
        { success: false, error: 'Failed to update pharmacopeial' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data: updatedPharmacopeial },
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
        { success: false, error: 'Pharmacopeial ID is required' },
        { status: 400 }
      );
    }

    const pharmacopeial = await Pharmacopeial.findById(id);
    if (!pharmacopeial) {
      return NextResponse.json(
        { success: false, error: 'Pharmacopeial not found' },
        { status: 404 }
      );
    }

    // Validate companyId and locationId against session
    if (!validateCompanyAndLocation(session, pharmacopeial.companyId, pharmacopeial.locationId)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized company or location access' },
        { status: 403 }
      );
    }

    await Pharmacopeial.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Pharmacopeial deleted successfully',
      deletedPharmacopeial: { id: pharmacopeial._id, pharmacopeial: pharmacopeial.pharmacopeial },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}