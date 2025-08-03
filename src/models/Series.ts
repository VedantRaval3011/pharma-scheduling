// app/models/Series.ts
import mongoose, { Schema, Document } from 'mongoose';

interface ISeries extends Document {
  name: string;
  prefix: string;
  suffix: string;
  currentNumber: number;
  padding: number;
  isActive: boolean;
  resetFrequency: 'daily' | 'monthly' | 'yearly' | 'none';
  companyId: string;
  locationId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const SeriesSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  prefix: { type: String, required: true },
  suffix: { type: String  },
  currentNumber: { type: Number, required: true, default: 1 },
  padding: { type: Number, required: true, default: 4 },
  isActive: { type: Boolean, required: true, default: true },
  resetFrequency: { 
    type: String, 
    enum: ['daily', 'monthly', 'yearly', 'none'], 
    default: 'none' 
  },
  companyId: { type: String, required: true },
  locationId: { type: String, required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update updatedAt on save
SeriesSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Series = mongoose.models.Series || mongoose.model<ISeries>('Series', SeriesSchema);
