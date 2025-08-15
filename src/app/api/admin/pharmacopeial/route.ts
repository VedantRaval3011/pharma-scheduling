import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Pharmacopoeial from '@/models/pharmacopeial';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
    const { pharmacopoeial, description, companyId, locationId } = body;

    // Validate input data
    const validationErrors = validatePharmacopoeialData({ pharmacopoeial, description, companyId, locationId });
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

    // Check for existing pharmacopoeial
    const existingPharmacopoeial = await Pharmacopoeial.findOne({ pharmacopoeial, companyId, locationId });
    if (existingPharmacopoeial) {
      return NextResponse.json(
        { success: false, error: 'Pharmacopoeial already exists for this company and location' },
        { status: 400 }
      );
    }

    // Create new pharmacopoeial
    const pharmacopoeialData = {
      pharmacopoeial: pharmacopoeial.trim(),
      description: description?.trim() || '',
      companyId: companyId.trim(),
      locationId: locationId.trim(),
      createdBy: session.user.userId || session.user.id,
    };
    
    const newPharmacopoeial = new Pharmacopoeial(pharmacopoeialData);
    const savedPharmacopoeial = await newPharmacopoeial.save();
    
    return NextResponse.json(
      { success: true, data: savedPharmacopoeial },
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

    const pharmacopoeials = await Pharmacopoeial.find({ companyId, locationId }).sort({ pharmacopoeial: 1 }).lean();
    
    return NextResponse.json({ success: true, data: pharmacopoeials }, { status: 200 });
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
    const { id, pharmacopoeial, description, companyId, locationId } = body;

    // Validate input data
    const validationErrors = validatePharmacopoeialData({ pharmacopoeial, description, companyId, locationId });
    if (!id) {
      validationErrors.push('Pharmacopoeial ID is required');
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

    // Find the existing pharmacopoeial
    const existingPharmacopoeial = await Pharmacopoeial.findById(id);
    if (!existingPharmacopoeial) {
      return NextResponse.json(
        { success: false, error: 'Pharmacopoeial not found' },
        { status: 404 }
      );
    }

    // Verify that companyId and locationId match the existing document
    if (existingPharmacopoeial.companyId !== companyId || existingPharmacopoeial.locationId !== locationId) {
      return NextResponse.json(
        { success: false, error: 'Company ID or Location ID does not match the existing pharmacopoeial' },
        { status: 403 }
      );
    }

    // Check for duplicate pharmacopoeial (excluding the current pharmacopoeial)
    const duplicatePharmacopoeial = await Pharmacopoeial.findOne({
      pharmacopoeial,
      companyId,
      locationId,
      _id: { $ne: id }
    });

    if (duplicatePharmacopoeial) {
      return NextResponse.json(
        { success: false, error: 'Pharmacopoeial already exists for this company and location' },
        { status: 400 }
      );
    }

    // Update the pharmacopoeial
    const updateData = {
      pharmacopoeial: pharmacopoeial.trim(),
      description: description?.trim() || '',
      updatedAt: new Date(),
    };
    
    const updatedPharmacopoeial = await Pharmacopoeial.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedPharmacopoeial) {
      return NextResponse.json(
        { success: false, error: 'Failed to update pharmacopoeial' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data: updatedPharmacopoeial },
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
        { success: false, error: 'Pharmacopoeial ID is required' },
        { status: 400 }
      );
    }

    const pharmacopoeial = await Pharmacopoeial.findById(id);
    if (!pharmacopoeial) {
      return NextResponse.json(
        { success: false, error: 'Pharmacopoeial not found' },
        { status: 404 }
      );
    }

    // Validate companyId and locationId against session
    if (!validateCompanyAndLocation(session, pharmacopoeial.companyId, pharmacopoeial.locationId)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized company or location access' },
        { status: 403 }
      );
    }

    await Pharmacopoeial.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Pharmacopoeial deleted successfully',
      deletedPharmacopoeial: { id: pharmacopoeial._id, pharmacopoeial: pharmacopoeial.pharmacopoeial },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}