import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

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
  employeeId?: string;
  userId?: string;
  name?: string;
  deletedEmployeeId?: string;
  deletedUserId?: string;
  [key: string]: any;
}

interface IAuditLog extends Document {
  auditId: string;
  employeeId: string; // UUID of the employee record
  userId: string; // User-friendly ID of the employee
  action: "CREATE" | "UPDATE" | "DELETE";
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

const auditLogSchema = new Schema({
  auditId: {
    type: String,
    default: () => uuidv4(),
    required: true,
    unique: true,
  },
  employeeId: {
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
    enum: ["CREATE", "UPDATE", "DELETE"],
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
    type: Schema.Types.Mixed, // Allow flexible structure but enforce object type
    required: true,
    default: {},
  },
});

export const AuditLog =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>("AuditLog", auditLogSchema);

export type { IFieldChange, IDetailsObject, IAuditLog };