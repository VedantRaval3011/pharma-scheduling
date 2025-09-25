import { Schema, model, Document, Types, models } from 'mongoose';
// Import Chemical model to ensure it's registered
import '@/models/chemical/chemical'

// Interface for Mobile Phase document
interface IMobilePhase extends Document {
  mobilePhaseId: string;
  mobilePhaseCode: string;
  isSolvent: boolean;
  isBuffer: boolean;
  bufferName?: string;
  solventName?: string;
  chemicals: Types.ObjectId[];
  dilutionFactor?: number;
  pHValue?: number;
  description?: string;
  companyId: string;
  locationId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define the Mobile Phase Schema
const mobilePhaseSchema = new Schema<IMobilePhase>(
  {
    mobilePhaseId: {
      type: String,
      required: [true, 'Mobile Phase ID is required'],
      trim: true,
      maxlength: [50, 'Mobile Phase ID cannot exceed 50 characters'],
    },
    mobilePhaseCode: {
      type: String,
      required: [true, 'Mobile Phase Code is required'],
      trim: true,
      maxlength: [20, 'Mobile Phase Code cannot exceed 20 characters'],
    },
    isSolvent: {
      type: Boolean,
      default: false,
    },
    isBuffer: {
      type: Boolean,
      default: false,
    },
    bufferName: {
      type: String,
      trim: true,
      required: false,
      maxlength: [100, 'Buffer Name cannot exceed 100 characters'],
    },
    solventName: {
      type: String,
      trim: true,
      maxlength: [100, 'Solvent Name cannot exceed 100 characters'],
    },
    chemicals: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Chemical'
      }
    ],
    dilutionFactor: {
      type: Number,
      min: [0, 'Dilution Factor cannot be negative'],
      required: false,
    },
    pHValue: {
      type: Number,
      min: [0, 'pH Value cannot be negative'],
      max: [14, 'pH Value cannot exceed 14'],
      required: function () {
        return this.isBuffer;
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      required: false,
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
    createdBy: {
      type: String,
      required: [true, 'Created By is required'],
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound unique indexes for company-location scoped uniqueness
mobilePhaseSchema.index(
  { companyId: 1, locationId: 1, mobilePhaseId: 1 }, 
  { unique: true, name: 'company_location_mobilePhaseId_unique' }
);

mobilePhaseSchema.index(
  { companyId: 1, locationId: 1, mobilePhaseCode: 1 }, 
  { unique: true, name: 'company_location_mobilePhaseCode_unique' }
);

// Keep existing index for general querying
mobilePhaseSchema.index({ companyId: 1, locationId: 1 });

// Pre-save hook remains the same
mobilePhaseSchema.pre('save', async function (next) {
  if (this.isSolvent && !this.solventName) {
    return next(new Error('Solvent Name is required when isSolvent is true'));
  }
  if (!this.isBuffer && this.bufferName) {
    this.bufferName = undefined;
  }
  if (!this.isSolvent && this.solventName) {
    this.solventName = undefined;
  }
  if (!this.isBuffer && this.pHValue !== undefined) {
    this.pHValue = undefined;
  }
  next();
});

const MobilePhase = models.MobilePhase || model<IMobilePhase>('MobilePhase', mobilePhaseSchema);
export default MobilePhase;