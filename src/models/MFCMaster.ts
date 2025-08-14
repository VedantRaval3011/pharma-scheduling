// models/MFCMaster.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IMFCMaster extends Document {
  mfcNumber: number;
  companyId: string;
  locationId: string;
  genericName: string;
  apiId: string;
  departmentId: string;
  testTypeId: string;
  detectorTypeId: string;
  pharmacopoeialId: string;
  columnCode: string;
  mobilePhaseCode1: string;
  mobilePhaseCode2?: string;
  mobilePhaseCode3?: string;
  mobilePhaseCode4?: string;
  sampleInjection: number;
  blankInjection: number;
  bracketingFrequency: number;
  injectionTime: number;
  runTime: number;
  testApplicability: boolean;
  bulk: boolean;
  fp: boolean;
  stabilityPartial: boolean;
  stabilityFinal: boolean;
  amv: boolean;
  pv: boolean;
  cv: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const MFCMasterSchema = new Schema<IMFCMaster>({
  mfcNumber: {
    type: Number,
    required: true,
  },
  companyId: {
    type: String,
    required: true,
    index: true,
  },
  locationId: {
    type: String,
    required: true,
    index: true,
  },
  genericName: {
    type: String,
    required: true,
    trim: true,
  },
  apiId: {
    type: String,
    required: true,
  },
  departmentId: {
    type: String,
    required: true,
  },
  testTypeId: {
    type: String,
    required: true,
  },
  detectorTypeId: {
    type: String,
    required: true,
  },
  pharmacopoeialId: {
    type: String,
    required: true,
  },
  columnCode: {
    type: String,
    required: true,
  },
  mobilePhaseCode1: {
    type: String,
    required: true,
  },
  mobilePhaseCode2: {
    type: String,
    required: false,
  },
  mobilePhaseCode3: {
    type: String,
    required: false,
  },
  mobilePhaseCode4: {
    type: String,
    required: false,
  },
  sampleInjection: {
    type: Number,
    required: true,
  },
  blankInjection: {
    type: Number,
    required: true,
  },
  bracketingFrequency: {
    type: Number,
    required: true,
  },
  injectionTime: {
    type: Number,
    required: true,
  },
  runTime: {
    type: Number,
    required: true,
  },
  testApplicability: {
    type: Boolean,
    default: false,
  },
  bulk: {
    type: Boolean,
    default: false,
  },
  fp: {
    type: Boolean,
    default: false,
  },
  stabilityPartial: {
    type: Boolean,
    default: false,
  },
  stabilityFinal: {
    type: Boolean,
    default: false,
  },
  amv: {
    type: Boolean,
    default: false,
  },
  pv: {
    type: Boolean,
    default: false,
  },
  cv: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for data isolation
MFCMasterSchema.index({ companyId: 1, locationId: 1 });

// Unique constraint for MFC Number within company and location
MFCMasterSchema.index({ 
  mfcNumber: 1, 
  companyId: 1, 
  locationId: 1 
}, { unique: true });

// Update the updatedAt field before saving
MFCMasterSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.MFCMaster || mongoose.model<IMFCMaster>('MFCMaster', MFCMasterSchema);