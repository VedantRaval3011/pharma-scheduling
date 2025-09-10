import mongoose from 'mongoose';

const chemicalSchema = new mongoose.Schema({
  chemicalName: {
    type: String,
    required: [true, 'Chemical name is required'],
    trim: true,
    maxlength: [100, 'Chemical name cannot exceed 100 characters']
  },
  isSolvent: {
    type: Boolean,
    default: false
  },
  isBuffer: {
    type: Boolean,
    default: false
  },
  desc: {
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
chemicalSchema.index({ chemicalName: 1, companyId: 1, locationId: 1 }, { unique: true });

// Index for better query performance
chemicalSchema.index({ companyId: 1, locationId: 1 });

const Chemical = mongoose.models.Chemical || mongoose.model('Chemical', chemicalSchema);

export default Chemical;