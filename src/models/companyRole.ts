// models/companyRole.ts
import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface ICompanyRole extends Document {
  roleId: string;
  name: string;
  companyId: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const companyRoleSchema = new Schema<ICompanyRole>({
  roleId: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4(),
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  companyId: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  createdBy: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

companyRoleSchema.index({ companyId: 1, name: 1 }, { unique: true });

export const CompanyRole = mongoose.models.CompanyRole || mongoose.model<ICompanyRole>('CompanyRole', companyRoleSchema);