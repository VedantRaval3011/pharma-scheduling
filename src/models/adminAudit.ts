import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Define interfaces for change tracking
interface IFieldChange {
  field: string;
  oldValue: any;
  newValue: any;
  dataType: string;
}

interface IDetailsObject {
  message?: string;
  changes?: IFieldChange[];
  performedBy?: string;
  adminId?: string;
  userId?: string;
  name?: string;
  [key: string]: any;
}

interface IAdminAuditLog extends Document {
  auditId: string;
  adminId: string; // UUID of the admin record
  userId: string; // User-friendly ID of the admin
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  performedBy: string; // ID of the user performing the action
  timestamp: Date;
  details: IDetailsObject;
}

const fieldChangeSchema = new Schema({
  field: {
    type: String,
    required: true,
  },
  oldValue: {
    type: Schema.Types.Mixed,
    required: true,
  },
  newValue: {
    type: Schema.Types.Mixed,
    required: true,
  },
  dataType: {
    type: String,
    required: true,
  },
});

const adminAuditLogSchema = new Schema({
  auditId: {
    type: String,
    default: () => uuidv4(),
    required: true,
    unique: true,
  },
  adminId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  action: {
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'CHANGE_PASSWORD'],
    required: true,
  },
  performedBy: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
  details: {
    type: Schema.Types.Mixed,
    required: true,
    default: {},
  },
});

export const AdminAuditLog =
  mongoose.models.AdminAuditLog ||
  mongoose.model<IAdminAuditLog>('AdminAuditLog', adminAuditLogSchema);

export type { IFieldChange, IDetailsObject, IAdminAuditLog };