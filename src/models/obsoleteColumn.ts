import mongoose, { Schema, Document } from 'mongoose';

interface IColumnDescription {
  prefix: string;
  carbonType: string;
  linkedCarbonType: string;
  innerDiameter: number;
  length: number;
  particleSize: number;
  suffix: string;
  make: string;
  columnId: string;
  installationDate: string;
  usePrefix: boolean;
  useSuffix: boolean;
  isObsolete: boolean;
}

interface IObsoleteColumn extends Document {
  columnCode: string;
  descriptions: IColumnDescription[];
  companyId: string;
  locationId: string;
}

const ColumnDescriptionSchema = new Schema<IColumnDescription>({
  prefix: { type: String, required: false, default: '', trim: true },
  carbonType: { type: String, required: true, trim: true },
  linkedCarbonType: { type: String, required: false, default: '', trim: true },
  innerDiameter: { type: Number, required: true, min: 0, default: 0 },
  length: { type: Number, required: true, min: 0, default: 0 },
  particleSize: { type: Number, required: true, min: 0, default: 0 },
  suffix: { type: String, required: false, default: '', trim: true },
  make: { type: String, required: true, trim: true },
  columnId: { type: String, required: true, trim: true },
  installationDate: { type: String, required: true },
  usePrefix: { type: Boolean, default: false },
  useSuffix: { type: Boolean, default: false },
  isObsolete: { type: Boolean, default: true },
}, { _id: false });

const ObsoleteColumnSchema = new Schema<IObsoleteColumn>({
  columnCode: { 
    type: String, 
    required: true, 
    trim: true,
  },
  descriptions: {
    type: [ColumnDescriptionSchema],
    required: true,
    validate: {
      validator: function(descriptions: IColumnDescription[]) {
        return descriptions.length > 0;
      },
      message: 'At least one description is required'
    }
  },
  companyId: { type: String, required: true },
  locationId: { type: String, required: true },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

ObsoleteColumnSchema.index(
  { columnCode: 1, companyId: 1, locationId: 1 }, 
  { unique: true }
);

ObsoleteColumnSchema.pre('save', function(next) {
  if (this.columnCode) {
    this.columnCode = this.columnCode.trim();
  }
  
  if (!this.descriptions || this.descriptions.length === 0) {
    next(new Error('At least one description is required'));
    return;
  }
  
  for (let i = 0; i < this.descriptions.length; i++) {
    const desc = this.descriptions[i];
    if (!desc.carbonType || desc.carbonType.trim() === '') {
      next(new Error(`Carbon Type is required for description ${i + 1}`));
      return;
    }
    if (!desc.make || desc.make.trim() === '') {
      next(new Error(`Make is required for description ${i + 1}`));
      return;
    }
    if (!desc.columnId || desc.columnId.trim() === '') {
      next(new Error(`Column ID is required for description ${i + 1}`));
      return;
    }
    if (!desc.installationDate) {
      next(new Error(`Installation Date is required for description ${i + 1}`));
      return;
    }
    if (isNaN(desc.innerDiameter) || desc.innerDiameter < 0) {
      next(new Error(`Invalid inner diameter for description ${i + 1}`));
      return;
    }
    if (isNaN(desc.length) || desc.length < 0) {
      next(new Error(`Invalid length for description ${i + 1}`));
      return;
    }
    if (isNaN(desc.particleSize) || desc.particleSize < 0) {
      next(new Error(`Invalid particle size for description ${i + 1}`));
      return;
    }
  }
  
  next();
});

export default mongoose.models.ObsoleteColumn || mongoose.model<IObsoleteColumn>('ObsoleteColumn', ObsoleteColumnSchema);