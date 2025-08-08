import mongoose from 'mongoose';

const apiSchema = new mongoose.Schema({
  api: {
    type: String,
    required: [true, 'API name is required'],
    trim: true,
    maxlength: [100, 'API name cannot exceed 100 characters']
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
apiSchema.index({ api: 1, companyId: 1, locationId: 1 }, { unique: true });

// Index for better query performance
apiSchema.index({ companyId: 1, locationId: 1 });

const Api = mongoose.models.Api || mongoose.model('Api', apiSchema);

export default Api;