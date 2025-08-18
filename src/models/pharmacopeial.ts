import mongoose from 'mongoose';

const pharmacopoeialSchema = new mongoose.Schema({
  pharmacopoeial: {
    type: String,
    required: [true, 'Pharmacopoeial name is required'],
    trim: true,
    maxlength: [100, 'Pharmacopoeial name cannot exceed 100 characters']
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
pharmacopoeialSchema.index({ pharmacopoeial: 1, companyId: 1, locationId: 1 }, { unique: true });

// Index for better query performance
pharmacopoeialSchema.index({ companyId: 1, locationId: 1 });

const Pharmacopoeial = mongoose.models.Pharmacopeial || mongoose.model('Pharmacopeial', pharmacopoeialSchema);

export default Pharmacopoeial;