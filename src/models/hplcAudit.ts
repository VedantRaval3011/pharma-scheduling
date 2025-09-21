import mongoose, { Document, Schema } from 'mongoose';

export interface IHPLCAuditLog extends Document {
  userId: string;
  action: string;
  data: {
    type: string;
    detector: string;
    internalCode: string;
    isActive: boolean;
    companyId: string;
    locationId: string;
  };
  previousData?: {
    type: string;
    detector: string;
    internalCode: string;
    isActive: boolean;
    companyId: string;
    locationId: string;
  };
  companyId: string;
  locationId: string;
  timestamp: Date;
}

const HPLCAuditLogSchema: Schema<IHPLCAuditLog> = new Schema(
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
      type: {
        type: String,
        required: true,
      },
      detector: {
        type: String,
        required: true,
      },
      internalCode: {
        type: String,
        required: true,
      },
      isActive: {
        type: Boolean,
        required: true,
      },
      companyId: {
        type: String,
        required: true,
      },
      locationId: {
        type: String,
        required: true,
      },
    },
    previousData: {
      type: {
        type: String,
      },
      detector: {
        type: String,
      },
      internalCode: {
        type: String,
      },
      isActive: {
        type: Boolean,
      },
      companyId: {
        type: String,
      },
      locationId: {
        type: String,
      },
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
    collection: 'hplc_audit',
  }
);

HPLCAuditLogSchema.index({ companyId: 1, locationId: 1, timestamp: -1 });

export default mongoose.models.HPLCAuditLog || mongoose.model<IHPLCAuditLog>('HPLCAuditLog', HPLCAuditLogSchema);