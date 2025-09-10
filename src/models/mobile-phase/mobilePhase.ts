import { Schema, model, Document, Types, models } from 'mongoose';

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
      unique: true,
      trim: true,
      maxlength: [50, 'Mobile Phase ID cannot exceed 50 characters'],
    },
    mobilePhaseCode: {
      type: String,
      required: [true, 'Mobile Phase Code is required'],
      unique: true,
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
      // Reference to Chemical Master (chemicalName)
      validate: {
        validator: async function (value: string) {
          if (this.isBuffer && !value) {
            return false; // bufferName is required if isBuffer is true
          }
          if (value) {
            const Chemical = model('Chemical');
            const chemical = await Chemical.findOne({ chemicalName: value });
            return !!chemical; // Ensure bufferName exists in Chemical Master
          }
          return true;
        },
        message: 'Buffer Name must reference a valid chemical in Chemical Master',
      },
    },
    solventName: {
      type: String,
      trim: true,
      maxlength: [100, 'Solvent Name cannot exceed 100 characters'],
      // Reference to Chemical Master (chemicalName)
      validate: {
        validator: async function (value: string) {
          if (this.isSolvent && !value) {
            return false; // solventName is required if isSolvent is true
          }
          if (value) {
            const Chemical = model('Chemical');
            const chemical = await Chemical.findOne({ chemicalName: value });
            return !!chemical; // Ensure solventName exists in Chemical Master
          }
          return true;
        },
        message: 'Solvent Name must reference a valid chemical in Chemical Master',
      },
    },
    chemicals: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Chemical',
        validate: {
          validator: async function (value: Types.ObjectId) {
            const Chemical = model('Chemical');
            const chemical = await Chemical.findById(value);
            return !!chemical; // Ensure each chemical ID exists in Chemical Master
          },
          message: 'Invalid chemical ID in chemicals array',
        },
      },
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
        return this.isBuffer; // pHValue is required if isBuffer is true
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
    timestamps: true, // Automatically updates createdAt and updatedAt
  }
);

mobilePhaseSchema.index({ companyId: 1, locationId: 1 });

// Pre-save hook to validate bufferName and solventName constraints
mobilePhaseSchema.pre('save', async function (next) {
 
  if (this.isSolvent && !this.solventName) {
    return next(new Error('Solvent Name is required when isSolvent is true'));
  }
  if (!this.isBuffer && this.bufferName) {
    this.bufferName = undefined; // Clear bufferName if isBuffer is false
  }
  if (!this.isSolvent && this.solventName) {
    this.solventName = undefined; // Clear solventName if isSolvent is false
  }
  if (!this.isBuffer && this.pHValue !== undefined) {
    this.pHValue = undefined; // Clear pHValue if isBuffer is false
  }
  next();
});

const MobilePhase = models.MobilePhase || model<IMobilePhase>('MobilePhase', mobilePhaseSchema);
export default MobilePhase;
