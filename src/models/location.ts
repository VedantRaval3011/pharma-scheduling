import mongoose, { Schema, Document } from 'mongoose';

interface ILocation extends Document {
  locationId: string;
  name: string;
  companyId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const locationSchema = new Schema<ILocation>({
  locationId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  companyId: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  createdBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

export const Location = mongoose.models.Location || mongoose.model<ILocation>('Location', locationSchema);