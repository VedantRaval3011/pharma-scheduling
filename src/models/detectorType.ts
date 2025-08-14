// models/detectorType.ts
import mongoose from 'mongoose';

const detectorTypeSchema = new mongoose.Schema({
  detectorType: {
    type: String,
    required: [true, 'Detector type name is required'],
    trim: true,
    maxlength: [100, 'Detector type name cannot exceed 100 characters']
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
detectorTypeSchema.index({ detectorType: 1, companyId: 1, locationId: 1 }, { unique: true });

// Index for better query performance
detectorTypeSchema.index({ companyId: 1, locationId: 1 });

const DetectorType = mongoose.models.DetectorType || mongoose.model('DetectorType', detectorTypeSchema);

export default DetectorType;

