// models/MFCAudit.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IChangeDetail {
  field: string;          // e.g., "generics[0].apis[0].testTypes[1].detectorTypeId"
  oldValue: any;
  newValue: any;
}

export interface IMFCAudit extends Document {
  mfcId: string;
  mfcNumber: string;
  companyId: string;
  locationId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  performedBy: string;     // userId or username
  performedAt: Date;
  changes: IChangeDetail[]; // granular field-level changes
  oldData?: Record<string, any>; // full snapshot before change
  newData?: Record<string, any>; // full snapshot after change
  ipAddress?: string;
  userAgent?: string;
  reason?: string;         // optional reason for update
}

const ChangeSchema = new Schema<IChangeDetail>({
  field: { type: String, required: true },
  oldValue: { type: Schema.Types.Mixed },
  newValue: { type: Schema.Types.Mixed },
});

const MFCAuditSchema = new Schema<IMFCAudit>({
  mfcId: { type: String, required: true, index: true },
  mfcNumber: { type: String, required: true, index: true },
  companyId: { type: String, required: true, index: true },
  locationId: { type: String, required: true, index: true },
  action: { type: String, required: true, enum: ['CREATE', 'UPDATE', 'DELETE'] },
  performedBy: { type: String, required: true },
  performedAt: { type: Date, default: Date.now, index: true },
  changes: [ChangeSchema], // array of changed fields
  oldData: { type: Schema.Types.Mixed }, // optional full snapshot
  newData: { type: Schema.Types.Mixed }, // optional full snapshot
  ipAddress: { type: String },
  userAgent: { type: String },
  reason: { type: String },
});

// Compound indexes for querying
MFCAuditSchema.index({ companyId: 1, locationId: 1 });
MFCAuditSchema.index({ mfcId: 1, performedAt: -1 });
MFCAuditSchema.index({ performedBy: 1, performedAt: -1 });
MFCAuditSchema.index({ action: 1, performedAt: -1 });

export default mongoose.models.MFCAudit ||
  mongoose.model<IMFCAudit>('MFCAudit', MFCAuditSchema);
