import mongoose, { Schema, Document } from 'mongoose';

interface ICompany extends Document {
  companyId: string;
  name: string;
  locations: { locationId: string; name: string }[];
  createdBy: string;
  userIds: string[]; // New field to store associated user IDs
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompany>({
  companyId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  locations: [{
    locationId: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    }
  }],
  createdBy: {
    type: String,
    required: true
  },
  userIds: [{
    type: String,
    required: true,
    lowercase: true,
    trim: true
  }],
}, {
  timestamps: true
});

export const Company = mongoose.models.Company || mongoose.model<ICompany>('Company', companySchema);