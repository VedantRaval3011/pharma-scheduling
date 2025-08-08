import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Api from '@/models/apiMaster';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper function to validate API data
function validateApiData(data: any) {
  const errors: string[] = [];
  if (!data.api) {
    errors.push('API name is required');
  } else if (typeof data.api !== 'string') {
    errors.push('API name must be a string');
  } else if (data.api.trim().length === 0) {
    errors.push('API name cannot be empty');
  } else if (data.api.trim().length > 100) {
    errors.push('API name cannot exceed 100 characters');
  }
  if (data.desc && typeof data.desc !== 'string') {
    errors.push('Description must be a string');
  } else if (data.desc && data.desc.length > 500) {
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
      console.error("POST: Unauthorized or no company assigned", { session });
      return NextResponse.json(
        { success: false, error: 'Unauthorized or no company assigned' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log("POST: Received body:", body); // Log incoming request body
    const { api, desc, companyId, locationId } = body;

    // Validate input data
    const validationErrors = validateApiData({ api, desc, companyId, locationId });
    if (validationErrors.length > 0) {
      console.error("POST: Validation errors:", validationErrors);
      return NextResponse.json(
        { success: false, error: validationErrors.join(', '), validationErrors },
        { status: 400 }
      );
    }

    // Validate companyId and locationId against session
    const isValidCompanyLocation = validateCompanyAndLocation(session, companyId, locationId);
    if (!isValidCompanyLocation) {
      console.error("POST: Unauthorized company/location", { companyId, locationId });
      return NextResponse.json(
        { success: false, error: 'Unauthorized company or location access' },
        { status: 403 }
      );
    }

    // Check for existing API
    const existingApi = await Api.findOne({ api, companyId, locationId });
    if (existingApi) {
      console.error("POST: API already exists", { api, companyId, locationId });
      return NextResponse.json(
        { success: false, error: 'API already exists for this company and location' },
        { status: 400 }
      );
    }

    // Create new API
    const apiData = {
      api: api.trim(),
      desc: desc?.trim() || '',
      companyId: companyId.trim(),
      locationId: locationId.trim(),
      createdBy: session.user.userId || session.user.id,
    };
    
    console.log("POST: Creating API:", apiData);
    const newApi = new Api(apiData);
    const savedApi = await newApi.save();
    
    console.log("POST: API saved successfully:", savedApi);
    return NextResponse.json(
      { success: true, data: savedApi },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST: Server error:", error);
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

    const apis = await Api.find({ companyId, locationId }).sort({ api: 1 }).lean();
    
    return NextResponse.json({ success: true, data: apis }, { status: 200 });
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
      console.error("PUT: Unauthorized or no company assigned", { session });
      return NextResponse.json(
        { success: false, error: 'Unauthorized or no company assigned' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log("PUT: Received body:", body);
    const { id, api, desc, companyId, locationId } = body;

    // Validate input data
    const validationErrors = validateApiData({ api, desc, companyId, locationId });
    if (!id) {
      validationErrors.push('API ID is required');
    }
    if (validationErrors.length > 0) {
      console.error("PUT: Validation errors:", validationErrors);
      return NextResponse.json(
        { success: false, error: validationErrors.join(', '), validationErrors },
        { status: 400 }
      );
    }

    // Validate companyId and locationId against session
    const isValidCompanyLocation = validateCompanyAndLocation(session, companyId, locationId);
    if (!isValidCompanyLocation) {
      console.error("PUT: Unauthorized company/location", { companyId, locationId });
      return NextResponse.json(
        { success: false, error: 'Unauthorized company or location access' },
        { status: 403 }
      );
    }

    // Find the existing API
    const existingApi = await Api.findById(id);
    if (!existingApi) {
      console.error("PUT: API not found", { id });
      return NextResponse.json(
        { success: false, error: 'API not found' },
        { status: 404 }
      );
    }

    // Verify that companyId and locationId match the existing document
    if (existingApi.companyId !== companyId || existingApi.locationId !== locationId) {
      console.error("PUT: Company/Location mismatch", { existingApi, companyId, locationId });
      return NextResponse.json(
        { success: false, error: 'Company ID or Location ID does not match the existing API' },
        { status: 403 }
      );
    }

    // Check for duplicate API (excluding the current API)
    const duplicateApi = await Api.findOne({
      api,
      companyId,
      locationId,
      _id: { $ne: id }
    });

    if (duplicateApi) {
      console.error("PUT: API already exists", { api, companyId, locationId });
      return NextResponse.json(
        { success: false, error: 'API already exists for this company and location' },
        { status: 400 }
      );
    }

    // Update the API
    const updateData = {
      api: api.trim(),
      desc: desc?.trim() || '',
      updatedAt: new Date(),
    };
    
    console.log("PUT: Updating API:", updateData);
    const updatedApi = await Api.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedApi) {
      console.error("PUT: Failed to update API", { id });
      return NextResponse.json(
        { success: false, error: 'Failed to update API' },
        { status: 500 }
      );
    }

    console.log("PUT: API updated successfully:", updatedApi);
    return NextResponse.json(
      { success: true, data: updatedApi },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("PUT: Server error:", error);
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
        { success: false, error: 'API ID is required' },
        { status: 400 }
      );
    }

    const api = await Api.findById(id);
    if (!api) {
      return NextResponse.json(
        { success: false, error: 'API not found' },
        { status: 404 }
      );
    }

    // Validate companyId and locationId against session
    if (!validateCompanyAndLocation(session, api.companyId, api.locationId)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized company or location access' },
        { status: 403 }
      );
    }

    await Api.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'API deleted successfully',
      deletedApi: { id: api._id, api: api.api },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}