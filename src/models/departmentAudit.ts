import mongoose, { Document, Schema } from 'mongoose';

export interface IDepartmentAuditLog extends Document {
  userId: string;
  action: string;
  data: {
    department: string;
    description: string;
    companyId: string;
    locationId: string;
  };
  previousData?: {
    department: string;
    description: string;
    companyId: string;
    locationId: string;
  };
  companyId: string;
  locationId: string;
  timestamp: Date;
}

const DepartmentAuditLogSchema: Schema<IDepartmentAuditLog> = new Schema(
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
    collection: 'department_audit',
  }
);

DepartmentAuditLogSchema.index({ companyId: 1, locationId: 1, timestamp: -1 });

export default mongoose.models.DepartmentAuditLog || mongoose.model<IDepartmentAuditLog>('DepartmentAuditLog', DepartmentAuditLogSchema);