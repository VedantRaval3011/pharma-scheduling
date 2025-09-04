import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  department: {
    type: String,
    required: [true, 'Department name is required'],
    trim: true,
    maxlength: [100, 'Department name cannot exceed 100 characters']
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
  daysOfUrgency: {
    type: Number,
    min: [0, 'Days of urgency cannot be negative'],
    max: [30, 'Days of urgency cannot exceed 30 days'],
    default: 0
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
departmentSchema.index({ department: 1, companyId: 1, locationId: 1 }, { unique: true });

// Index for better query performance
departmentSchema.index({ companyId: 1, locationId: 1 });

const Department = mongoose.models.Department || mongoose.model('Department', departmentSchema);

export default Department;