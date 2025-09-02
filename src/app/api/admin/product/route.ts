// api/product/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Product from '@/models/product/product';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  broadcastMasterDataCreate,
  broadcastMasterDataUpdate,
  broadcastMasterDataDelete 
} from "@/lib/sse";
import MFCMaster from '@/models/MFCMaster';

async function syncProductMFCRelationship(
  productId: string,
  newMfcIds: string[],
  oldMfcIds: string[] = [],
  companyId: string,
  locationId: string
) {
  try {
    // Remove product from MFCs that are no longer associated
    const mfcsToRemove = oldMfcIds.filter(id => !newMfcIds.includes(id));
    if (mfcsToRemove.length > 0) {
      await MFCMaster.updateMany(
        {
          _id: { $in: mfcsToRemove },
          companyId,
          locationId
        },
        {
          $pull: { productIds: productId }
        }
      );
    }

    // Add product to new MFCs
    const mfcsToAdd = newMfcIds.filter(id => !oldMfcIds.includes(id));
    if (mfcsToAdd.length > 0) {
      await MFCMaster.updateMany(
        {
          _id: { $in: mfcsToAdd },
          companyId,
          locationId
        },
        {
          $addToSet: { productIds: productId }
        }
      );
    }
  } catch (error) {
    console.error('Error syncing product-MFC relationship:', error);
    throw error;
  }
}

// Helper function to validate Product data
function validateProductData(data: any) {
  const errors: string[] = [];
  if (!data.productName) {
    errors.push('Product name is required');
  } else if (typeof data.productName !== 'string') {
    errors.push('Product name must be a string');
  } else if (data.productName.trim().length === 0) {
    errors.push('Product name cannot be empty');
  } else if (data.productName.trim().length > 100) {
    errors.push('Product name cannot exceed 100 characters');
  }
  if (!data.productCode) {
    errors.push('Product code is required');
  } else if (typeof data.productCode !== 'string') {
    errors.push('Product code must be a string');
  } else if (data.productCode.trim().length === 0) {
    errors.push('Product code cannot be empty');
  } else if (data.productCode.trim().length > 50) {
    errors.push('Product code cannot exceed 50 characters');
  }
  if (data.genericName && typeof data.genericName !== 'string') {
    errors.push('Generic name must be a string');
  }
  if (data.marketedBy && typeof data.marketedBy !== 'string') {
    errors.push('Marketed by must be a string');
  }
  if (!data.makeId) {
    errors.push('Make ID is required');
  } else if (typeof data.makeId !== 'string' || data.makeId.trim().length === 0) {
    errors.push('Make ID must be a non-empty string');
  }
  if (data.mfcs && !Array.isArray(data.mfcs)) {
    errors.push('MFCs must be an array');
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
    const { productName, productCode, genericName, makeId, marketedBy, mfcs, companyId, locationId } = body;

    // Validate input data
    const validationErrors = validateProductData({ productName, productCode, genericName, makeId, marketedBy, mfcs, companyId, locationId });
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: validationErrors.join(', '), validationErrors },
        { status: 400 }
      );
    }

    // Check for existing product
    const existingProduct = await Product.findOne({ productCode: productCode.trim(), companyId, locationId });
    if (existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Product already exists' },
        { status: 409 }
      );
    }

    // Create new product
    const newProduct = new Product({
      productName: productName.trim(),
      productCode: productCode.trim(),
      genericName: genericName?.trim() || '',
      makeId,
      marketedBy: marketedBy?.trim() || '',
      mfcs: mfcs || [],
      companyId,
      locationId,
      createdBy: session.user?.id || "system",
      updatedBy: session.user?.id || "system",
    });
    
    const savedProduct = await newProduct.save();

    // Sync with MFC Master
    if (mfcs && mfcs.length > 0) {
      await syncProductMFCRelationship(
        savedProduct._id.toString(),
        mfcs,
        [],
        companyId,
        locationId
      );
    }

    // Broadcast the create event to SSE clients
    broadcastMasterDataCreate(
      "products",
      savedProduct.toObject(),
      companyId,
      locationId
    );
    
    return NextResponse.json({
      success: true,
      data: savedProduct,
      message: "Product created successfully and synced with MFC records",
    });
  } catch (error: any) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}


// Updated PUT function
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
    const { id, productName, productCode, genericName, makeId, marketedBy, mfcs, companyId, locationId } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Product ID is required" },
        { status: 400 }
      );
    }

    if (!productName?.trim()) {
      return NextResponse.json(
        { success: false, error: "Product name is required" },
        { status: 400 }
      );
    }

    if (!productCode?.trim()) {
      return NextResponse.json(
        { success: false, error: "Product code is required" },
        { status: 400 }
      );
    }

    if (!makeId) {
      return NextResponse.json(
        { success: false, error: "Make ID is required" },
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

    // Get the existing product for comparison
    const existingProduct = await Product.findOne({
      _id: id,
      companyId,
      locationId,
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Check if the new code conflicts with another product
    const duplicateProduct = await Product.findOne({
      productCode: productCode.trim(),
      companyId,
      locationId,
      _id: { $ne: id },
    });

    if (duplicateProduct) {
      return NextResponse.json(
        { success: false, error: "Product code already exists" },
        { status: 409 }
      );
    }

    // Update the product
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        productName: productName.trim(),
        productCode: productCode.trim(),
        genericName: genericName?.trim() || "",
        makeId,
        marketedBy: marketedBy?.trim() || "",
        mfcs: mfcs || [],
        updatedBy: session.user?.id || "system",
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return NextResponse.json(
        { success: false, error: "Failed to update Product" },
        { status: 500 }
      );
    }

    // Sync with MFC Master - compare old and new MFC associations
    const oldMfcIds = existingProduct.mfcs || [];
    const newMfcIds = mfcs || [];
    
    await syncProductMFCRelationship(
      id,
      newMfcIds,
      oldMfcIds,
      companyId,
      locationId
    );

    // Broadcast the update event to SSE clients
    broadcastMasterDataUpdate(
      "products",
      updatedProduct.toObject(),
      companyId,
      locationId
    );

    return NextResponse.json({
      success: true,
      data: updatedProduct,
      message: "Product updated successfully and synced with MFC records",
    });
  } catch (error: any) {
    console.error("Update product error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Updated DELETE function
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
        { success: false, error: "Product ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get the product before deleting for broadcasting and cleanup
    const productToDelete = await Product.findById(id);

    if (!productToDelete) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Remove product from associated MFCs
    if (productToDelete.mfcs && productToDelete.mfcs.length > 0) {
      await MFCMaster.updateMany(
        {
          _id: { $in: productToDelete.mfcs },
          companyId: productToDelete.companyId,
          locationId: productToDelete.locationId
        },
        {
          $pull: { productIds: id }
        }
      );
    }

    // Delete the product
    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return NextResponse.json(
        { success: false, error: "Failed to delete Product" },
        { status: 500 }
      );
    }

    // Broadcast the delete event to SSE clients
    broadcastMasterDataDelete(
      "products",
      deletedProduct.toObject(),
      productToDelete.companyId,
      productToDelete.locationId
    );

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully and removed from MFC records",
      data: deletedProduct,
    });
  } catch (error: any) {
    console.error("Delete product error:", error);
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

    const products = await Product.find({ companyId, locationId })
      .sort({ productName: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: products,
    });
  } catch (error: any) {
    console.error("Fetch products error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

