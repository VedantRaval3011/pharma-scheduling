// models/make.js
import mongoose from 'mongoose';

const makeSchema = new mongoose.Schema({
  make: {
    type: String,
    required: [true, 'Make name is required'],
    trim: true,
    maxlength: [100, 'Make name cannot exceed 100 characters']
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
  timestamps: true, // This adds createdAt and updatedAt automatically
  versionKey: false // This removes the __v field
});

// Compound index to ensure uniqueness per company/location
makeSchema.index({ make: 1, companyId: 1, locationId: 1 }, { unique: true });

// Index for better query performance
makeSchema.index({ companyId: 1, locationId: 1 });

const Make = mongoose.models.Make || mongoose.model('Make', makeSchema);

export default Make;