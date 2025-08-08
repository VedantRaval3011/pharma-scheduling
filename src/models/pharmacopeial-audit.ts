import mongoose, { Document, Schema } from 'mongoose';

export interface IPharmacopeialAuditLog extends Document {
  userId: string;
  action: string;
  data: {
    pharmacopeial: string;
    description: string;
    companyId: string;
    locationId: string;
  };
  previousData?: {
    pharmacopeial: string;
    description: string;
    companyId: string;
    locationId: string;
  };
  companyId: string;
  locationId: string;
  timestamp: Date;
}

const PharmacopeialAuditLogSchema: Schema<IPharmacopeialAuditLog> = new Schema(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      trim: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: ['CREATE', 'UPDATE', 'DELETE'],
    },
    data: {
      type: Object,
      required: [true, 'Data is required'],
    },
    previousData: {
      type: Object,
    },
    companyId: {
      type: String,
      required: [true, 'Company ID is required'],
      trim: true,
    },
    locationId: {
      type: String,
      required: [true, 'Location ID is required'],
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'pharmacopeial_audit',
  }
);

PharmacopeialAuditLogSchema.index({ companyId: 1, locationId: 1, timestamp: -1 });

export default mongoose.models.PharmacopeialAuditLog || mongoose.model<IPharmacopeialAuditLog>('PharmacopeialAuditLog', PharmacopeialAuditLogSchema);