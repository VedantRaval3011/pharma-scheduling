// models/productMakeAudit.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IProductMakeAuditLog extends Document {
  userId: string;
  action: string;
  data: {
    makeName: string;
    mfgLicenceNumber: string;
    gstNo: string;
    contactNo: string;
    mfgDate: Date;
    expDate: Date;
    description: string;
    companyId: string;
    locationId: string;
  };
  previousData?: {
    makeName: string;
    mfgLicenceNumber: string;
    gstNo: string;
    contactNo: string;
    mfgDate: Date;
    expDate: Date;
    description: string;
    companyId: string;
    locationId: string;
  };
  companyId: string;
  locationId: string;
  timestamp: Date;
}

const ProductMakeAuditLogSchema: Schema<IProductMakeAuditLog> = new Schema(
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
    collection: 'product_make_audit',
  }
);

ProductMakeAuditLogSchema.index({ companyId: 1, locationId: 1, timestamp: -1 });

export default mongoose.models.ProductMakeAuditLog || mongoose.model<IProductMakeAuditLog>('ProductMakeAuditLog', ProductMakeAuditLogSchema);