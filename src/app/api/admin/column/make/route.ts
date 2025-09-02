import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Make from '@/models/make';
import { PrefixSuffix } from '@/models/PrefixSuffix';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Pusher from 'pusher';

// Initialize Pusher client - optimized for performance
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true
});


// Types for better TypeScript support
interface PusherEventData {
  action: 'create' | 'update' | 'delete';
  type: 'make';
  data: {
    id: string;
    name: string;
    description?: string;
    oldName?: string;
    oldDescription?: string;
  };
  timestamp: string;
  companyId: string;
  locationId: string;
}

// Helper function to send Pusher notification - optimized for minimal latency
async function sendPusherNotification(
  action: 'create' | 'update' | 'delete',
  type: 'make',
  data: any,
  companyId: string,
  locationId: string
): Promise<void> {
  try {
    // Use specific channel per company-location for better performance
    const channelName = `master-updates-${companyId}-${locationId}`;
    const eventData: PusherEventData = {
      action,
      type,
      data,
      timestamp: new Date().toISOString(),
      companyId,
      locationId
    };

    // Non-blocking async call for minimal latency impact
    pusher.trigger(channelName, 'master-data-update', eventData).catch(error => {
      console.error('Pusher notification failed:', error);
      // Don't throw error to avoid breaking the main operation
    });
    
    console.log(`Pusher notification sent: ${action} ${type}`, data);
  } catch (error) {
    console.error('Failed to send Pusher notification:', error);
    // Don't throw error here to avoid breaking the main operation
  }
}

// Helper function to validate company data
function validateCompanyData(data: any) {
  const errors: string[] = [];
  if (!data.make) {
    errors.push('Make name is required');
  } else if (typeof data.make !== 'string') {
    errors.push('Make name must be a string');
  } else if (data.make.trim().length === 0) {
    errors.push('Make name cannot be empty');
  } else if (data.make.trim().length > 100) {
    errors.push('Make name cannot exceed 100 characters');
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
    const { make, description, companyId, locationId } = body;

    // Validate input data
    const validationErrors = validateCompanyData({ make, description, companyId, locationId });
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

    // Check for existing make
    const existingMake = await Make.findOne({ make, companyId, locationId });
    if (existingMake) {
      return NextResponse.json(
        { success: false, error: 'Make already exists for this company and location' },
        { status: 400 }
      );
    }

    // Create new make
    const makeData = {
      make: make.trim(),
      description: description?.trim() || '',
      companyId: companyId.trim(),
      locationId: locationId.trim(),
      createdBy: session.user.userId || session.user.id,
    };
    
    const newMake = new Make(makeData);
    const savedMake = await newMake.save();
    
    // Send Pusher notification for CREATE
    await sendPusherNotification('create', 'make', {
      id: savedMake._id.toString(),
      name: savedMake.make,
      description: savedMake.description
    }, companyId, locationId);
    
    return NextResponse.json(
      { success: true, data: savedMake },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST Make Error:', error);
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

    const makes = await Make.find({ companyId, locationId }).sort({ make: 1 }).lean();
    
    return NextResponse.json({ success: true, data: makes }, { status: 200 });
  } catch (error: any) {
    console.error('GET Make Error:', error);
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
    const { id, make, description, companyId, locationId } = body;

    // Validate input data
    const validationErrors = validateCompanyData({ make, description, companyId, locationId });
    if (!id) {
      validationErrors.push('Make ID is required');
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

    // Find the existing make
    const existingMake = await Make.findById(id);
    if (!existingMake) {
      return NextResponse.json(
        { success: false, error: 'Make not found' },
        { status: 404 }
      );
    }

    // Verify that companyId and locationId match the existing document
    if (existingMake.companyId !== companyId || existingMake.locationId !== locationId) {
      return NextResponse.json(
        { success: false, error: 'Company ID or Location ID does not match the existing make' },
        { status: 403 }
      );
    }

    // Check for duplicate make (excluding the current make)
    const duplicateMake = await Make.findOne({
      make,
      companyId,
      locationId,
      _id: { $ne: id }
    });

    if (duplicateMake) {
      return NextResponse.json(
        { success: false, error: 'Make already exists for this company and location' },
        { status: 400 }
      );
    }

    // Store old values for comparison
    const oldMake = {
      name: existingMake.make,
      description: existingMake.description
    };

    // Update the make
    const updateData = {
      make: make.trim(),
      description: description?.trim() || '',
      updatedAt: new Date(),
    };
    
    const updatedMake = await Make.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedMake) {
      return NextResponse.json(
        { success: false, error: 'Failed to update make' },
        { status: 500 }
      );
    }

    // Send Pusher notification for UPDATE
    await sendPusherNotification('update', 'make', {
      id: updatedMake._id.toString(),
      name: updatedMake.make,
      description: updatedMake.description,
      oldName: oldMake.name,
      oldDescription: oldMake.description
    }, companyId, locationId);

    return NextResponse.json(
      { success: true, data: updatedMake },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('PUT Make Error:', error);
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
        { success: false, error: 'Make ID is required' },
        { status: 400 }
      );
    }

    const make = await Make.findById(id);
    if (!make) {
      return NextResponse.json(
        { success: false, error: 'Make not found' },
        { status: 404 }
      );
    }

    // Validate companyId and locationId against session
    if (!validateCompanyAndLocation(session, make.companyId, make.locationId)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized company or location access' },
        { status: 403 }
      );
    }

    // Store make info before deletion
    const deletedMakeInfo = {
      id: make._id.toString(),
      name: make.make,
      description: make.description
    };

    await Make.findByIdAndDelete(id);
    
    // Send Pusher notification for DELETE
    await sendPusherNotification('delete', 'make', deletedMakeInfo, make.companyId, make.locationId);
    
    return NextResponse.json({
      success: true,
      message: 'Make deleted successfully',
      deletedMake: { id: make._id, make: make.make },
    });
  } catch (error: any) {
    console.error('DELETE Make Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}