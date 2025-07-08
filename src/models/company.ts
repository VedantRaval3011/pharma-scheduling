// lib/models/Company.ts
import mongoose, { Schema, Document } from 'mongoose';

interface ICompany extends Document {
  companyId: string;
  name: string;
  createdBy: string;
  createdAt: Date;
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
  createdBy: {
    type: String,
    required: true // super admin user ID
  }
}, {
  timestamps: true
});

export const Company = mongoose.models.Company || mongoose.model<ICompany>('Company', companySchema);