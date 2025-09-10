import mongoose, { Document, Schema } from 'mongoose';

export interface IChemicalAuditLog extends Document {
  userId: string;
  action: string;
  data: {
    chemicalName: string;
    isSolvent: boolean;
    isBuffer: boolean;
    desc: string;
    companyId: string;
    locationId: string;
  };
  previousData?: {
    chemicalName: string;
    isSolvent: boolean;
    isBuffer: boolean;
    desc: string;
    companyId: string;
    locationId: string;
  };
  companyId: string;
  locationId: string;
  timestamp: Date;
}

const ChemicalAuditLogSchema: Schema<IChemicalAuditLog> = new Schema(
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
    collection: 'chemical_audit',
  }
);

ChemicalAuditLogSchema.index({ companyId: 1, locationId: 1, timestamp: -1 });

export default mongoose.models.ChemicalAuditLog || mongoose.model<IChemicalAuditLog>('ChemicalAuditLog', ChemicalAuditLogSchema);