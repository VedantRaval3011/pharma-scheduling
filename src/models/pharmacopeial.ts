import mongoose from 'mongoose';

const pharmacopeialSchema = new mongoose.Schema({
  pharmacopeial: {
    type: String,
    required: [true, 'Pharmacopeial name is required'],
    trim: true,
    maxlength: [100, 'Pharmacopeial name cannot exceed 100 characters']
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
pharmacopeialSchema.index({ pharmacopeial: 1, companyId: 1, locationId: 1 }, { unique: true });

// Index for better query performance
pharmacopeialSchema.index({ companyId: 1, locationId: 1 });

const Pharmacopeial = mongoose.models.Pharmacopeial || mongoose.model('Pharmacopeial', pharmacopeialSchema);

export default Pharmacopeial;