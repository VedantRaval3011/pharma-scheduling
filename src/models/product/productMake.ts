// models/productMake.ts
import mongoose from 'mongoose';

const productMakeSchema = new mongoose.Schema({
  makeName: {
    type: String,
    required: [true, 'Make name is required'],
    trim: true,
    maxlength: [100, 'Make name cannot exceed 100 characters']
  },
  mfgLicenceNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'MFG licence number cannot exceed 50 characters']
  },
  gstNo: {
    type: String,
    trim: true,
    maxlength: [15, 'GST number cannot exceed 15 characters']
  },
  contactNo: {
    type: String,
    trim: true,
    maxlength: [20, 'Contact number cannot exceed 20 characters']
  },
  mfgDate: {
    type: Date
  },
  expDate: {
    type: Date
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
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
productMakeSchema.index({ makeName: 1, companyId: 1, locationId: 1 }, { unique: true });

// Index for better query performance
productMakeSchema.index({ companyId: 1, locationId: 1 });

const ProductMake = mongoose.models.ProductMake || mongoose.model('ProductMake', productMakeSchema);

export default ProductMake;