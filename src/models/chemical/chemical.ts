import mongoose from 'mongoose';

const chemicalSchema = new mongoose.Schema({
  chemicalName: {
    type: String,
    required: [true, 'Chemical name is required'],
    trim: true,
    maxlength: [100, 'Chemical name cannot exceed 100 characters'],
    validate: {
      validator: function(this: any, value: string) {
        // Validate that chemicalName is not in the desc array of THIS chemical
        if (this.desc && Array.isArray(this.desc)) {
          const normalizedName = value.toLowerCase().trim();
          return !this.desc.some((d: string) => 
            d.toLowerCase().trim() === normalizedName
          );
        }
        return true;
      },
      message: 'Chemical name cannot be the same as any of its own description/alias values'
    }
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
    type: [String],
    default: [],
    validate: {
      validator: function(this: any, arr: string[]) {
        // Validate each string in the array
        if (!Array.isArray(arr)) return false;
        
        // Check max length for each item
        const allValid = arr.every(item => 
          typeof item === 'string' && item.length <= 200
        );
        
        if (!allValid) return false;
        
        // Check that no desc item matches the chemical name
        if (this.chemicalName) {
          const normalizedName = this.chemicalName.toLowerCase().trim();
          const hasMatch = arr.some((d: string) => 
            d.toLowerCase().trim() === normalizedName
          );
          if (hasMatch) return false;
        }
        
        // Check for duplicates within the desc array (case-insensitive)
        const normalized = arr.map(d => d.toLowerCase().trim());
        const uniqueSet = new Set(normalized);
        if (normalized.length !== uniqueSet.size) return false;
        
        return true;
      },
      message: 'Description array contains invalid entries: items must be strings (max 200 chars), unique, and cannot match the chemical name'
    }
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
  },
  updatedBy: {
    type: String
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