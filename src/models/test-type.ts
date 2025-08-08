import mongoose from 'mongoose';

const testTypeSchema = new mongoose.Schema({
  testType: {
    type: String,
    required: [true, 'Test Type name is required'],
    trim: true,
    maxlength: [100, 'Test Type name cannot exceed 100 characters']
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
testTypeSchema.index({ testType: 1, companyId: 1, locationId: 1 }, { unique: true });

// Index for better query performance
testTypeSchema.index({ companyId: 1, locationId: 1 });

const TestType = mongoose.models.TestType || mongoose.model('TestType', testTypeSchema);

export default TestType;