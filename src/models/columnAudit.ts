import mongoose, { Schema, Document } from 'mongoose';

interface IColumnAudit extends Document {
  action: string;
  userId: string;
  module: string;
  companyId: string;
  locationId: string;
  changes: any;
  timestamp: Date;
}

const ColumnAuditSchema = new Schema<IColumnAudit>({
  action: { type: String, required: true, enum: ['create', 'update', 'delete'] },
  userId: { type: String, required: true },
  module: { type: String, required: true },
  companyId: { type: String, required: true },
  locationId: { type: String, required: true },
  changes: { type: Schema.Types.Mixed, required: true },
  timestamp: { type: Date, default: Date.now }, 
});

export default mongoose.models.ColumnAudit || mongoose.model<IColumnAudit>('ColumnAudit', ColumnAuditSchema);