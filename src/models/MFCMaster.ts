import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITestType {
  testTypeId: string;
  selectMakeSpecific: boolean;
  columnCode: string;
  isColumnCodeLinkedToMfc: boolean;
  mobilePhaseCodes: string[];  // Array of exactly 6 strings (can be empty)
  detectorTypeId: string;
  pharmacopoeialId: string[]; // Changed to array for multi-select
  sampleInjection: number;
  standardInjection: number;
  blankInjection: number;
  systemSuitability: number;
  sensitivity: number;
  placebo: number;
  reference1: number;
  reference2: number;
  bracketingFrequency: number;
  injectionTime: number;
  runTime: number;
  uniqueRuntimes: boolean;

  // Existing runtimes
  blankRunTime?: number;
  standardRunTime?: number;
  sampleRunTime?: number;

  // Newly added runtimes
  systemSuitabilityRunTime?: number;
  sensitivityRunTime?: number;
  placeboRunTime?: number;
  reference1RunTime?: number;
  reference2RunTime?: number;

  washTime: number;
  testApplicability: boolean;
  numberOfInjections?: number;
  numberOfInjectionsAMV?: number;
  numberOfInjectionsPV?: number;
  numberOfInjectionsCV?: number;
  bulk: boolean;
  fp: boolean;
  stabilityPartial: boolean;
  stabilityFinal: boolean;
  amv: boolean;
  pv: boolean;
  cv: boolean;
  isLinked: boolean;
  priority: 'urgent' | 'high' | 'normal';

  // New field
  isOutsourcedTest: boolean;
}

export interface IAPI {
  apiName: string;
  testTypes: ITestType[];
}

export interface IGeneric {
  genericName: string;
  apis: IAPI[];
}

export interface IMFCMaster extends Document {
  mfcNumber: string;
  companyId: string;
  locationId: string;
  productIds: Types.ObjectId[];
  generics: IGeneric[];
  departmentId: string;
  wash: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  priority: 'urgent' | 'high' | 'normal';
  isObsolete: boolean; // New field
  isRawMaterial: boolean; // New field
}

const TestTypeSchema = new Schema<ITestType>({
  testTypeId: { type: String, required: true },
  selectMakeSpecific: { type: Boolean, default: false },
  columnCode: { type: String, required: true },
  isColumnCodeLinkedToMfc: { type: Boolean, default: false },
  mobilePhaseCodes: {
    type: [String],
    default: ["", "", "", "", "", ""],
    validate: {
      validator: function (arr: string[]): boolean {
        if (arr.length !== 6) return false;
        return !!arr[0] && arr[0].trim() !== "";
      },
      message:
        "Mobile phase codes must have exactly 6 elements with MP01 (first element) required",
    },
  },
  detectorTypeId: { type: String, required: true },
  pharmacopoeialId: { type: [String], required: true }, // Changed to array for multi-select
  sampleInjection: { type: Number, default: 0 },
  standardInjection: { type: Number, default: 0 },
  blankInjection: { type: Number, default: 0 },
  systemSuitability: { type: Number, default: 0 },
  sensitivity: { type: Number, default: 0 },
  placebo: { type: Number, default: 0 },
  reference1: { type: Number, default: 0 },
  reference2: { type: Number, default: 0 },
  bracketingFrequency: { type: Number, default: 0 },
  injectionTime: { type: Number, default: 0 },
  runTime: { type: Number, default: 0 },
  uniqueRuntimes: { type: Boolean, default: false },

  // Existing runtimes
  blankRunTime: { type: Number, default: 0 },
  standardRunTime: { type: Number, default: 0 },
  sampleRunTime: { type: Number, default: 0 },

  // New runtimes
  systemSuitabilityRunTime: { type: Number, default: 0 },
  sensitivityRunTime: { type: Number, default: 0 },
  placeboRunTime: { type: Number, default: 0 },
  reference1RunTime: { type: Number, default: 0 },
  reference2RunTime: { type: Number, default: 0 },

  washTime: { type: Number, default: 0 },
  testApplicability: { type: Boolean, default: false },
  numberOfInjections: { type: Number, default: 0 },
  numberOfInjectionsAMV: { type: Number, default: 0 },
  numberOfInjectionsPV: { type: Number, default: 0 },
  numberOfInjectionsCV: { type: Number, default: 0 },
  bulk: { type: Boolean, default: false },
  fp: { type: Boolean, default: false },
  stabilityPartial: { type: Boolean, default: false },
  stabilityFinal: { type: Boolean, default: false },
  amv: { type: Boolean, default: false },
  pv: { type: Boolean, default: false },
  cv: { type: Boolean, default: false },
  isLinked: { type: Boolean, default: false },
  priority: { type: String, enum: ['urgent', 'high', 'normal'], default: 'normal' },

  // New field
  isOutsourcedTest: { type: Boolean, default: false },
});

const APISchema = new Schema<IAPI>({
  apiName: { type: String, required: true },
  testTypes: [TestTypeSchema],
});

const GenericSchema = new Schema<IGeneric>({
  genericName: { type: String, required: true },
  apis: [APISchema],
});

const MFCMasterSchema = new Schema<IMFCMaster>({
  mfcNumber: { type: String, required: true },
  companyId: { type: String, required: true, index: true },
  locationId: { type: String, required: true, index: true },
  productIds: [{ type: Schema.Types.ObjectId, ref: 'ProductMaster' }],
  generics: [GenericSchema],
  departmentId: { type: String, required: true },
  wash: { type: Number, default: 0 },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  priority: { type: String, enum: ['urgent', 'high', 'normal'], default: 'normal' },
  isObsolete: { type: Boolean, default: false }, // New field
  isRawMaterial: { type: Boolean, default: false }, // New field
});

// Compound + unique index
MFCMasterSchema.index({ companyId: 1, locationId: 1 });
MFCMasterSchema.index(
  { mfcNumber: 1, companyId: 1, locationId: 1 },
  { unique: true }
);

MFCMasterSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.MFCMaster ||
  mongoose.model<IMFCMaster>('MFCMaster', MFCMasterSchema);
