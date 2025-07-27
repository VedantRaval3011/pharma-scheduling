import mongoose, { Schema, Document } from 'mongoose';

export interface IRoleAssignmentAudit extends Document {
  employeeId: string;
  updatedBy: string;
  changes: {
    previous?: { [modulePath: string]: string[] };
    new?: { [modulePath: string]: string[] };
  };
  timestamp: Date;
}

const RoleAssignmentAuditSchema: Schema = new Schema({
  employeeId: { type: String, required: true },
  updatedBy: { type: String, required: true },
  changes: {
    type: {
      previous: { type: Map, of: [String], default: undefined },
      new: { type: Map, of: [String], default: undefined },
    },
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.models.RoleAssignmentAudit ||
  mongoose.model<IRoleAssignmentAudit>('RoleAssignmentAudit', RoleAssignmentAuditSchema);
