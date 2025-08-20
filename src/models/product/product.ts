// models/product.ts
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  productCode: {
    type: String,
    required: [true, 'Product code is required'],
    trim: true,
    maxlength: [50, 'Product code cannot exceed 50 characters']
  },
  genericName: {
    type: String,
    trim: true,
    maxlength: [100, 'Generic name cannot exceed 100 characters'],
    default: ''
  },
  makeId: {
    type: String,
    required: [true, 'Make ID is required'],
    trim: true
  },
  marketedBy: {
    type: String,
    trim: true,
    maxlength: [100, 'Marketed by cannot exceed 100 characters'],
    default: ''
  },
  mfcs: [{
    type: String,
    trim: true
  }],
  companyId: {
    type: String,
    required: [true, 'Company ID is required'],
    trim: true
  },
  locationId: {
    type: String,
    required: [true, 'Location ID is required'],
    trim: true
  },
  createdBy: {
    type: String,
    required: [true, 'Created by is required']
  }
}, {
  timestamps: true,
  versionKey: false
});

// Compound index to ensure uniqueness per company/location
productSchema.index({ productCode: 1, companyId: 1, locationId: 1 }, { unique: true });

// Index for better query performance
productSchema.index({ companyId: 1, locationId: 1 });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

export default Product;