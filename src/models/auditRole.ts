import mongoose from 'mongoose';

const auditRoleSchema = new mongoose.Schema({
  auditId: { type: String, required: true, unique: true },
  roleId: { type: String, required: true, index: true },
  action: { type: String, required: true, enum: ['CREATE', 'UPDATE'] },
  changedData: { type: Object, required: true },
  performedBy: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// Check if the model already exists before creating it
export const AuditRole = mongoose.models.AuditRole || mongoose.model('AuditRole', auditRoleSchema);