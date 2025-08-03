// src/models/Audit.ts
import mongoose from 'mongoose';

const seriesAuditSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  action: { type: String, enum: ['create', 'read', 'update', 'delete'], required: true },
  fieldName: { type: String },
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now },
  seriesId: { type: String },
  companyId: { type: String, required: true },
  locationId: { type: String, required: true },
});

export const SeriesAudit = mongoose.models.SeriesAudit || mongoose.model('SeriesAudit', seriesAuditSchema);