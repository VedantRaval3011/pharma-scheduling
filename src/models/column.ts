import mongoose, { Schema, Document } from 'mongoose';

interface IColumnDescription {
  prefix: string;
  carbonType: string;
  innerDiameter: number;
  length: number;
  particleSize: number;
  suffix: string;
  make: string;
}

interface IColumn extends Document {
  columnCode: string;
  descriptions: IColumnDescription[];
  companyId: string;
  locationId: string;
}

const ColumnDescriptionSchema = new Schema<IColumnDescription>({
  prefix: { type: String, required: false, default: '', trim: true }, // Explicitly optional
  carbonType: { type: String, required: true, trim: true },
  innerDiameter: { type: Number, required: true, min: 0, default: 0 },
  length: { type: Number, required: true, min: 0, default: 0 },
  particleSize: { type: Number, required: true, min: 0, default: 0 },
  suffix: { type: String, required: false, default: '', trim: true },
  make: { type: String, required: false, default: '', trim: true },
}, { _id: false });

// Create compound unique index instead of unique on columnCode alone
const ColumnSchema = new Schema<IColumn>({
  columnCode: { 
    type: String, 
    required: true, 
    trim: true,
    // Remove unique constraint from here since we want compound uniqueness
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
  // Add validation at schema level
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create compound unique index for columnCode + companyId + locationId
ColumnSchema.index(
  { columnCode: 1, companyId: 1, locationId: 1 }, 
  { unique: true }
);

// Add pre-save middleware for additional validation
ColumnSchema.pre('save', function(next) {
  // Ensure columnCode is properly formatted
  if (this.columnCode) {
    this.columnCode = this.columnCode.trim();
  }
  
  // Validate descriptions
  if (!this.descriptions || this.descriptions.length === 0) {
    next(new Error('At least one description is required'));
    return;
  }
  
  // Validate each description
  for (let i = 0; i < this.descriptions.length; i++) {
    const desc = this.descriptions[i];
    if (!desc.carbonType || desc.carbonType.trim() === '') {
      next(new Error(`Carbon Type is required for description ${i + 1}`));
      return;
    }
  }
  
  next();
});

// Add error handling for duplicate key errors
ColumnSchema.post('save', function(error: any, doc: any, next: any) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    next(new Error('Column code already exists for this company and location'));
  } else {
    next(error);
  }
});

export default mongoose.models.Column || mongoose.model<IColumn>('Column', ColumnSchema);