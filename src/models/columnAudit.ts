import mongoose, { Schema, Document } from 'mongoose';

interface IAuditChange {
  field: string;
  from: any;
  to: any;
}

interface IColumnAudit extends Document {
  action: string;
  userId: string;
  module: string;
  companyId: string;
  locationId: string;
  changes: IAuditChange[];
  timestamp: Date;
  columnCode?: string;
}

const ColumnAuditSchema = new Schema<IColumnAudit>({
  action: { type: String, required: true, enum: ['create', 'update', 'delete'] },
  userId: { type: String, required: true },
  module: { type: String, required: true },
  companyId: { type: String, required: true },
  locationId: { type: String, required: true },
  changes: [{ field: String, from: Schema.Types.Mixed, to: Schema.Types.Mixed }],
  timestamp: { type: Date, default: Date.now },
  columnCode: { type: String }
});

export default mongoose.models.ColumnAudit || mongoose.model<IColumnAudit>('ColumnAudit', ColumnAuditSchema);