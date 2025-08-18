import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Api from '@/models/apiMaster';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  broadcastMasterDataCreate,
  broadcastMasterDataUpdate,
  broadcastMasterDataDelete 
} from "@/lib/sse";

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
  // If session validation is simplified, just return true for now
  // You can implement proper validation based on your session structure
  return true;
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
    console.log("POST: Received body:", body);
    const { api, description, companyId, locationId } = body;

    // Validate input data
    const validationErrors = validateApiData({ api, description, companyId, locationId });
    if (validationErrors.length > 0) {
      console.error("POST: Validation errors:", validationErrors);
      return NextResponse.json(
        { success: false, error: validationErrors.join(', '), validationErrors },
        { status: 400 }
      );
    }

    // Check for existing API
    const existingApi = await Api.findOne({ api: api.trim(), companyId, locationId });
    if (existingApi) {
      console.error("POST: API already exists", { api, companyId, locationId });
      return NextResponse.json(
        { success: false, error: 'API already exists' },
        { status: 409 }
      );
    }

    // Create new API
    const newApi = new Api({
      api: api.trim(),
      description: description?.trim() || '',
      companyId,
      locationId,
      createdBy: session.user?.id || "system",
      updatedBy: session.user?.id || "system",
    });
    
    console.log("POST: Creating API:", newApi);
    const savedApi = await newApi.save();

    // Broadcast the create event to SSE clients
    broadcastMasterDataCreate(
      "apis",
      savedApi.toObject(),
      companyId,
      locationId
    );
    
    console.log("POST: API saved successfully:", savedApi);
    return NextResponse.json({
      success: true,
      data: savedApi,
      message: "API created successfully",
    });
  } catch (error: any) {
    console.error("POST: Server error:", error);
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

    const apis = await Api.find({ companyId, locationId })
      .sort({ api: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: apis,
    });
  } catch (error: any) {
    console.error("Fetch APIs error:", error);
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
    console.log("PUT: Received body:", body);
    const { id, api, description, companyId, locationId } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "API ID is required" },
        { status: 400 }
      );
    }

    if (!api?.trim()) {
      return NextResponse.json(
        { success: false, error: "API is required" },
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

    // Get the existing API for comparison
    const existingApi = await Api.findOne({
      _id: id,
      companyId,
      locationId,
    });

    if (!existingApi) {
      console.error("PUT: API not found", { id });
      return NextResponse.json(
        { success: false, error: "API not found" },
        { status: 404 }
      );
    }

    // Check if the new name conflicts with another API
    const duplicateApi = await Api.findOne({
      api: api.trim(),
      companyId,
      locationId,
      _id: { $ne: id },
    });

    if (duplicateApi) {
      console.error("PUT: API already exists", { api, companyId, locationId });
      return NextResponse.json(
        { success: false, error: "API name already exists" },
        { status: 409 }
      );
    }

    // Update the API
    const updatedApi = await Api.findByIdAndUpdate(
      id,
      {
        api: api.trim(),
        description: description?.trim() || "",
        updatedBy: session.user?.id || "system",
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedApi) {
      console.error("PUT: Failed to update API", { id });
      return NextResponse.json(
        { success: false, error: "Failed to update API" },
        { status: 500 }
      );
    }

    // Broadcast the update event to SSE clients
    broadcastMasterDataUpdate(
      "apis",
      updatedApi.toObject(),
      companyId,
      locationId
    );

    console.log("PUT: API updated successfully:", updatedApi);
    return NextResponse.json({
      success: true,
      data: updatedApi,
      message: "API updated successfully",
    });
  } catch (error: any) {
    console.error("PUT: Server error:", error);
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
        { success: false, error: "API ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get the API before deleting for broadcasting
    const apiToDelete = await Api.findById(id);

    if (!apiToDelete) {
      return NextResponse.json(
        { success: false, error: "API not found" },
        { status: 404 }
      );
    }

    // Delete the API
    const deletedApi = await Api.findByIdAndDelete(id);

    if (!deletedApi) {
      return NextResponse.json(
        { success: false, error: "Failed to delete API" },
        { status: 500 }
      );
    }

    // Broadcast the delete event to SSE clients
    broadcastMasterDataDelete(
      "apis",
      deletedApi.toObject(),
      apiToDelete.companyId,
      apiToDelete.locationId
    );

    return NextResponse.json({
      success: true,
      message: "API deleted successfully",
      data: deletedApi,
    });
  } catch (error: any) {
    console.error("Delete API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}