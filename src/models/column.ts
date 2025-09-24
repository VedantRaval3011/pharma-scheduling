import mongoose, { Schema, Document } from 'mongoose';

interface IColumnDescription {
  descriptionId: mongoose.Types.ObjectId; // ✅ Unique per description
  prefixId?: mongoose.Types.ObjectId;
  carbonType: string;
  linkedCarbonType: string;
  innerDiameter: number;
  length: number;
  particleSize: number;
  suffixId?: mongoose.Types.ObjectId;
  makeId: mongoose.Types.ObjectId;
  columnId: string;
  installationDate: string;
  usePrefix: boolean;
  useSuffix: boolean;
  usePrefixForNewCode: boolean;
  useSuffixForNewCode: boolean;
  isObsolete: boolean;
  description?: string;     // optional
  phMin?: number;          // pH range minimum (optional)
  phMax?: number;          // pH range maximum (optional)
}

interface IColumn extends Document {
  columnCode: string;
  descriptions: IColumnDescription[];
  companyId: string;
  locationId: string;
}

const ColumnDescriptionSchema = new Schema(
  {
    descriptionId: { type: mongoose.Schema.Types.ObjectId, required: true }, // ✅ new field
    prefixId: { type: mongoose.Schema.Types.ObjectId, ref: 'PrefixSuffix', required: false },
    carbonType: { type: String, required: true, trim: true },
    linkedCarbonType: { type: String, required: false, default: '', trim: true },
    innerDiameter: { type: Number, required: true, min: 0, default: 0 },
    length: { type: Number, required: true, min: 0, default: 0 },
    particleSize: { type: Number, required: true, min: 0, default: 0 },
    suffixId: { type: mongoose.Schema.Types.ObjectId, ref: 'PrefixSuffix', required: false },
    makeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Make', required: true },
    columnId: { type: String, required: true, trim: true },
    installationDate: { type: String, required: true },
    usePrefix: { type: Boolean, default: false },
    useSuffix: { type: Boolean, default: false },
    usePrefixForNewCode: { type: Boolean, default: false },
    useSuffixForNewCode: { type: Boolean, default: false },
    isObsolete: { type: Boolean, default: false },

    // NEW optional fields
    description: { type: String, required: false, trim: true, default: '' },
    // pH range fields with proper validation
    phMin: { 
      type: Number, 
      required: false, 
      min: [0, 'pH minimum must be at least 0'], 
      max: [14, 'pH minimum cannot exceed 14'] 
    },
    phMax: { 
      type: Number, 
      required: false, 
      min: [0, 'pH maximum must be at least 0'], 
      max: [14, 'pH maximum cannot exceed 14'] 
    },
  },
  { _id: false }
); // still no auto _id, we manage descriptionId ourselves

const ColumnSchema = new Schema(
  {
    columnCode: {
      type: String,
      required: true,
      trim: true,
    },
    descriptions: {
      type: [ColumnDescriptionSchema],
      required: true,
      validate: {
        validator: function (descriptions: IColumnDescription[]) {
          return descriptions.length > 0;
        },
        message: 'At least one description is required'
      }
    },
    companyId: { type: String, required: true },
    locationId: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);


ColumnSchema.pre('save', function (next) {
  if (this.columnCode) {
    this.columnCode = this.columnCode.trim();
  }
  
  if (!this.descriptions || this.descriptions.length === 0) {
    return next(new Error('At least one description is required'));
  }
  
  for (let i = 0; i < this.descriptions.length; i++) {
    const desc = this.descriptions[i];
    
    // ✅ Assign unique descriptionId if missing
    if (!desc.descriptionId) {
      desc.descriptionId = new mongoose.Types.ObjectId();
    }
    
    // Existing validations
    if (!desc.carbonType || desc.carbonType.trim() === '') {
      return next(new Error(`Carbon Type is required for description ${i + 1}`));
    }
    if (!desc.makeId) {
      return next(new Error(`Make is required for description ${i + 1}`));
    }
    if (!desc.columnId || desc.columnId.trim() === '') {
      return next(new Error(`Column ID is required for description ${i + 1}`));
    }
    if (!desc.installationDate) {
      return next(new Error(`Installation Date is required for description ${i + 1}`));
    }
    if (isNaN(desc.innerDiameter) || desc.innerDiameter < 0) {
      return next(new Error(`Invalid inner diameter for description ${i + 1}`));
    }
    if (isNaN(desc.length) || desc.length < 0) {
      return next(new Error(`Invalid length for description ${i + 1}`));
    }
    if (isNaN(desc.particleSize) || desc.particleSize < 0) {
      return next(new Error(`Invalid particle size for description ${i + 1}`));
    }
    
    // NEW: pH range validation
    if (desc.phMin != null && (desc.phMin < 0 || desc.phMin > 14)) {
      return next(new Error(`Invalid pH minimum for description ${i + 1}: must be between 0 and 14`));
    }
    if (desc.phMax != null && (desc.phMax < 0 || desc.phMax > 14)) {
      return next(new Error(`Invalid pH maximum for description ${i + 1}: must be between 0 and 14`));
    }
    if (desc.phMin !== undefined && desc.phMin !== null && desc.phMax !== undefined && desc.phMax !== null && desc.phMin > desc.phMax) {
      return next(new Error(`Invalid pH range for description ${i + 1}: minimum (${desc.phMin}) cannot be greater than maximum (${desc.phMax})`));
    }
    
    // Optional: Validate that if one pH value is provided, both should be provided
    if (desc.phMin !== undefined && desc.phMin !== null && 
    desc.phMax !== undefined && desc.phMax !== null && 
    desc.phMin > desc.phMax) {
  return next(new Error(`Invalid pH range for description ${i + 1}: minimum (${desc.phMin}) cannot be greater than maximum (${desc.phMax})`));
}
  }
  
  next();
});

export default mongoose.models.Column || mongoose.model('Column', ColumnSchema);