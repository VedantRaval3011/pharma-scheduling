import mongoose, { Schema, Document } from 'mongoose';

export interface ITestType {
  testTypeId: string;
  columnCode: string;
  mobilePhaseCodes: string[];
  detectorTypeId: string;     // now here
  pharmacopoeialId: string;   // now here
  sampleInjection: number;
  standardInjection: number;
  blankInjection: number;
  bracketingFrequency: number;
  injectionTime: number;
  runTime: number;
  testApplicability: boolean;
}

export interface IAPI {
  apiName: string;
  testTypes: ITestType[];
}

export interface IGeneric {
  genericName: string;
  apis: IAPI[];
}

export interface IProductCode {
  code: string;
}

export interface IMFCMaster extends Document {
  mfcNumber: string;
  companyId: string;
  locationId: string;
  productCodes: IProductCode[];
  generics: IGeneric[];
  departmentId: string; // stays at MFC level
  bulk: boolean;
  fp: boolean;
  stabilityPartial: boolean;
  stabilityFinal: boolean;
  amv: boolean;
  pv: boolean;
  cv: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const TestTypeSchema = new Schema<ITestType>({
  testTypeId: { type: String, required: true },
  columnCode: { type: String, required: true },
  mobilePhaseCodes: [{ type: String, required: true }],
  detectorTypeId: { type: String, required: true },
  pharmacopoeialId: { type: String, required: true },
  sampleInjection: Number,
  standardInjection: Number,
  blankInjection: Number,
  bracketingFrequency: Number,
  injectionTime: Number,
  runTime: Number,
  testApplicability: { type: Boolean, default: false },
});

const APISchema = new Schema<IAPI>({
  apiName: { type: String, required: true },
  testTypes: [TestTypeSchema],
});

const GenericSchema = new Schema<IGeneric>({
  genericName: { type: String, required: true },
  apis: [APISchema],
});

const ProductCodeSchema = new Schema<IProductCode>({
  code: { type: String, required: true },
});

const MFCMasterSchema = new Schema<IMFCMaster>({
  mfcNumber: { type: String, required: true },
  companyId: { type: String, required: true, index: true },
  locationId: { type: String, required: true, index: true },
  productCodes: [ProductCodeSchema],
  generics: [GenericSchema],
  departmentId: { type: String, required: true }, // fixed per MFC
  bulk: { type: Boolean, default: false },
  fp: { type: Boolean, default: false },
  stabilityPartial: { type: Boolean, default: false },
  stabilityFinal: { type: Boolean, default: false },
  amv: { type: Boolean, default: false },
  pv: { type: Boolean, default: false },
  cv: { type: Boolean, default: false },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// compound + unique index
MFCMasterSchema.index({ companyId: 1, locationId: 1 });
MFCMasterSchema.index({ mfcNumber: 1, companyId: 1, locationId: 1 }, { unique: true });

MFCMasterSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.MFCMaster || mongoose.model<IMFCMaster>('MFCMaster', MFCMasterSchema);
