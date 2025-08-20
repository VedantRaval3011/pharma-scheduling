// api/productMake/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ProductMake from '@/models/product/productMake';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  broadcastMasterDataCreate,
  broadcastMasterDataUpdate,
  broadcastMasterDataDelete 
} from "@/lib/sse";

// Helper function to validate ProductMake data
function validateProductMakeData(data: any) {
  const errors: string[] = [];
  if (!data.makeName) {
    errors.push('Make name is required');
  } else if (typeof data.makeName !== 'string') {
    errors.push('Make name must be a string');
  } else if (data.makeName.trim().length === 0) {
    errors.push('Make name cannot be empty');
  } else if (data.makeName.trim().length > 100) {
    errors.push('Make name cannot exceed 100 characters');
  }
  if (data.description && typeof data.description !== 'string') {
    errors.push('Description must be a string');
  } else if (data.description && data.description.length > 500) {
    errors.push('Description cannot exceed 500 characters');
  }
  if (data.mfgLicenceNumber && typeof data.mfgLicenceNumber !== 'string') {
    errors.push('MFG licence number must be a string');
  }
  if (data.gstNo && typeof data.gstNo !== 'string') {
    errors.push('GST number must be a string');
  }
  if (data.contactNo && typeof data.contactNo !== 'string') {
    errors.push('Contact number must be a string');
  }
  if (data.mfgDate && !(data.mfgDate instanceof Date || !isNaN(Date.parse(data.mfgDate)))) {
    errors.push('Invalid manufacturing date');
  }
  if (data.expDate && !(data.expDate instanceof Date || !isNaN(Date.parse(data.expDate)))) {
    errors.push('Invalid expiry date');
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
    const { makeName, mfgLicenceNumber, gstNo, contactNo, mfgDate, expDate, description, companyId, locationId } = body;

    // Validate input data
    const validationErrors = validateProductMakeData({ makeName, mfgLicenceNumber, gstNo, contactNo, mfgDate, expDate, description, companyId, locationId });
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: validationErrors.join(', '), validationErrors },
        { status: 400 }
      );
    }

    // Check for existing product make
    const existingProductMake = await ProductMake.findOne({ makeName: makeName.trim(), companyId, locationId });
    if (existingProductMake) {
      return NextResponse.json(
        { success: false, error: 'Product Make already exists' },
        { status: 409 }
      );
    }

    // Create new product make
    const newProductMake = new ProductMake({
      makeName: makeName.trim(),
      mfgLicenceNumber: mfgLicenceNumber?.trim() || '',
      gstNo: gstNo?.trim() || '',
      contactNo: contactNo?.trim() || '',
      mfgDate: mfgDate ? new Date(mfgDate) : null,
      expDate: expDate ? new Date(expDate) : null,
      description: description?.trim() || '',
      companyId,
      locationId,
      createdBy: session.user?.id || "system",
      updatedBy: session.user?.id || "system",
    });
    
    const savedProductMake = await newProductMake.save();

    // Broadcast the create event to SSE clients
    broadcastMasterDataCreate(
      "productMakes",
      savedProductMake.toObject(),
      companyId,
      locationId
    );
    
    return NextResponse.json({
      success: true,
      data: savedProductMake,
      message: "Product Make created successfully",
    });
  } catch (error: any) {
    console.error("Create product make error:", error);
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

    const productMakes = await ProductMake.find({ companyId, locationId })
      .sort({ makeName: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: productMakes,
    });
  } catch (error: any) {
    console.error("Fetch product makes error:", error);
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
    const { id, makeName, mfgLicenceNumber, gstNo, contactNo, mfgDate, expDate, description, companyId, locationId } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Product Make ID is required" },
        { status: 400 }
      );
    }

    if (!makeName?.trim()) {
      return NextResponse.json(
        { success: false, error: "Make Name is required" },
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

    // Get the existing product make for comparison
    const existingProductMake = await ProductMake.findOne({
      _id: id,
      companyId,
      locationId,
    });

    if (!existingProductMake) {
      return NextResponse.json(
        { success: false, error: "Product Make not found" },
        { status: 404 }
      );
    }

    // Check if the new name conflicts with another product make
    const duplicateProductMake = await ProductMake.findOne({
      makeName: makeName.trim(),
      companyId,
      locationId,
      _id: { $ne: id },
    });

    if (duplicateProductMake) {
      return NextResponse.json(
        { success: false, error: "Product Make name already exists" },
        { status: 409 }
      );
    }

    // Update the product make
    const updatedProductMake = await ProductMake.findByIdAndUpdate(
      id,
      {
        makeName: makeName.trim(),
        mfgLicenceNumber: mfgLicenceNumber?.trim() || '',
        gstNo: gstNo?.trim() || '',
        contactNo: contactNo?.trim() || '',
        mfgDate: mfgDate ? new Date(mfgDate) : null,
        expDate: expDate ? new Date(expDate) : null,
        description: description?.trim() || '',
        updatedBy: session.user?.id || "system",
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedProductMake) {
      return NextResponse.json(
        { success: false, error: "Failed to update Product Make" },
        { status: 500 }
      );
    }

    // Broadcast the update event to SSE clients
    broadcastMasterDataUpdate(
      "productMakes",
      updatedProductMake.toObject(),
      companyId,
      locationId
    );

    return NextResponse.json({
      success: true,
      data: updatedProductMake,
      message: "Product Make updated successfully",
    });
  } catch (error: any) {
    console.error("Update product make error:", error);
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
        { success: false, error: "Product Make ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get the product make before deleting for broadcasting
    const productMakeToDelete = await ProductMake.findById(id);

    if (!productMakeToDelete) {
      return NextResponse.json(
        { success: false, error: "Product Make not found" },
        { status: 404 }
      );
    }

    // Delete the product make
    const deletedProductMake = await ProductMake.findByIdAndDelete(id);

    if (!deletedProductMake) {
      return NextResponse.json(
        { success: false, error: "Failed to delete Product Make" },
        { status: 500 }
      );
    }

    // Broadcast the delete event to SSE clients
    broadcastMasterDataDelete(
      "productMakes",
      deletedProductMake.toObject(),
      productMakeToDelete.companyId,
      productMakeToDelete.locationId
    );

    return NextResponse.json({
      success: true,
      message: "Product Make deleted successfully",
      data: deletedProductMake,
    });
  } catch (error: any) {
    console.error("Delete product make error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}