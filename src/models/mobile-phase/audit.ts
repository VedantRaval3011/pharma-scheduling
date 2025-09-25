import { Schema, model, Document, Types, models } from 'mongoose';

// Interface for Mobile Phase Audit Log document
interface IMobilePhaseAuditLog extends Document {
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  mobilePhaseId: string;
  data: {
    mobilePhaseId?: string;
    mobilePhaseCode?: string;
    isSolvent?: boolean;
    isBuffer?: boolean;
    bufferName?: string;
    solventName?: string;
    chemicals?: Types.ObjectId[];
    dilutionFactor?: number;
    pHValue?: number;
    description?: string;
    companyId?: string;
    locationId?: string;
  };
  previousData?: {
    mobilePhaseId?: string;
    mobilePhaseCode?: string;
    isSolvent?: boolean;
    isBuffer?: boolean;
    bufferName?: string;
    solventName?: string;
    chemicals?: Types.ObjectId[];
    dilutionFactor?: number;
    pHValue?: number;
    description?: string;
    companyId?: string;
    locationId?: string;
  };
  companyId: string;
  locationId: string;
  timestamp: Date;
}

// Define the Mobile Phase Audit Log Schema
const mobilePhaseAuditLogSchema = new Schema<IMobilePhaseAuditLog>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      trim: true,
    },
    action: {
      type: String,
      enum: {
        values: ['CREATE', 'UPDATE', 'DELETE'],
        message: '{VALUE} is not a valid action type',
      },
      required: [true, 'Action type is required'],
    },
    mobilePhaseId: {
      type: String,
      required: [true, 'Mobile Phase ID is required'],
      trim: true,
    },
    data: {
      mobilePhaseId: { type: String, trim: true },
      mobilePhaseCode: { type: String, trim: true },
      isSolvent: { type: Boolean },
      isBuffer: { type: Boolean },
      bufferName: { type: String, trim: true },
      solventName: { type: String, trim: true },
      chemicals: [{ type: Schema.Types.ObjectId, ref: 'Chemical' }],
      dilutionFactor: { type: Number },
      pHValue: { type: Number },
      description: { type: String, trim: true },
      companyId: { type: String, trim: true },
      locationId: { type: String, trim: true },
    },
    previousData: {
      mobilePhaseId: { type: String, trim: true },
      mobilePhaseCode: { type: String, trim: true },
      isSolvent: { type: Boolean },
      isBuffer: { type: Boolean },
      bufferName: { type: String, trim: true },
      solventName: { type: String, trim: true },
      chemicals: [{ type: Schema.Types.ObjectId, ref: 'Chemical' }],
      dilutionFactor: { type: Number },
      pHValue: { type: Number },
      description: { type: String, trim: true },
      companyId: { type: String, trim: true },
      locationId: { type: String, trim: true },
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
    timestamps: false,
  }
);

// Indexes for efficient querying
mobilePhaseAuditLogSchema.index({ companyId: 1, locationId: 1 });
mobilePhaseAuditLogSchema.index({ mobilePhaseId: 1, timestamp: -1 });
mobilePhaseAuditLogSchema.index({ userId: 1, action: 1, timestamp: -1 });

// Pre-save hook to validate data based on action
mobilePhaseAuditLogSchema.pre('save', function (next) {
  if (this.action === 'CREATE' && this.previousData) {
    this.previousData = undefined;
  }
  if (this.action === 'DELETE' && !this.previousData) {
    return next(new Error('Previous data is required for DELETE action'));
  }
  if (this.action === 'UPDATE' && !this.previousData) {
    return next(new Error('Previous data is required for UPDATE action'));
  }
  next();
});

// ✅ FIX: Check if model exists before creating it
const MobilePhaseAuditLog = models.MobilePhaseAuditLog || model<IMobilePhaseAuditLog>('MobilePhaseAuditLog', mobilePhaseAuditLogSchema);
export default MobilePhaseAuditLog;
