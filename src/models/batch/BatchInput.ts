// models/batch/BatchInput.ts
import { Schema, model, models } from 'mongoose';

/**
 * Extended Test schema (merges Batch + ITestType)
 */
const BatchTestSchema = new Schema({
  testTypeId: { type: String, required: true },
  testName: { type: String, required: true },

  // From ITestType
  columnCode: { type: String, required: true },
  isColumnCodeLinkedToMfc: { type: Boolean, default: false },
  selectMakeSpecific: { type: Boolean, default: false },
  mobilePhaseCodes: { type: [String], default: ["", "", "", "", "", ""] },
  detectorTypeId: { type: String, required: true },
  pharmacopoeialId: { 
    type: [String], 
    default: [],
    validate: {
      validator: function(v: string[]) {
        // Allow empty arrays, but if array has items, they should be non-empty strings
        return !v || v.length === 0 || v.every(id => id && id.trim() !== "");
      },
      message: 'pharmacopoeialId array cannot contain empty strings'
    }
  },

  // Injection counts
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

  // Runtimes breakdown
  blankRunTime: { type: Number, default: 0 },
  standardRunTime: { type: Number, default: 0 },
  sampleRunTime: { type: Number, default: 0 },
  systemSuitabilityRunTime: { type: Number, default: 0 },
  sensitivityRunTime: { type: Number, default: 0 },
  placeboRunTime: { type: Number, default: 0 },
  reference1RunTime: { type: Number, default: 0 },
  reference2RunTime: { type: Number, default: 0 },

  washTime: { type: Number, default: 0 },

  // Applicability & injections
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
  isOutsourcedTest: { type: Boolean, default: false },

  // Already in your batch schema (keep them)
  outsourced: { type: Boolean, default: false },
  continueTests: { type: Boolean, default: true },
  testStatus: { type: String, enum: ['Not Started', 'In Progress', 'Closed'], default: 'Not Started' },
  startedAt: { type: Date },
  endedAt: { type: Date },

  results: {
    actualResult: { type: Number },
    expectedResult: { type: Number },
    passed: { type: Boolean },
    remarks: { type: String }
  }
}, { _id: false });


/**
 * API schema inside Generic
 */
const BatchAPISchema = new Schema({
  apiName: { type: String, required: true },
  testTypes: [BatchTestSchema] // nested testTypes
}, { _id: false });


/**
 * Generic schema inside Batch
 */
const BatchGenericSchema = new Schema({
  genericName: { type: String, required: true },
  apis: [BatchAPISchema]
}, { _id: false });


/**
 * BatchInput schema (extended with full MFC details)
 */
const BatchInputSchema = new Schema({
  // Company/Location info
  companyId: { type: String, required: true },
  locationId: { type: String, required: true },

  // Batch info
  batchNumber: { type: String, required: true },
  manufacturingDate: { type: Date, required: true },
   withdrawalDate: { type: Date }, 
  priority: { type: String, enum: ['Urgent', 'High', 'Normal'], default: 'Normal' },
  batchStatus: { type: String, enum: ['Not Started', 'In Progress', 'Closed'], default: 'Not Started' },
  typeOfSample: { type: String, required: true },

  // Product info
  productCode: { type: String, required: true },
  productName: { type: String, required: true },
  genericName: { type: String, required: true },
  pharmacopeiaToUse: { type: String },
  pharmacopoeialName: { type: String },

  // MFC + Dept info
  mfcId: { type: String, required: true },
  mfcNumber: { type: String, required: true },
  departmentId: { type: String, required: true },
  departmentName: { type: String, required: true },
  daysForUrgency: { type: Number, default: 0 },
  wash: { type: Number, default: 0 },
  isObsolete: { type: Boolean, default: false },
  isRawMaterial: { type: Boolean, default: false },

  // Full Generic → API → Test hierarchy (copied from MFC)
  generics: [BatchGenericSchema],

  // Flat list of tests (execution level)
  tests: [BatchTestSchema],

  // Audit info
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  startedAt: { type: Date },
  endedAt: { type: Date }
});


// Compound index for unique batch numbers per company/location
BatchInputSchema.index(
  { batchNumber: 1, companyId: 1, locationId: 1 }, 
  { unique: true }
);

BatchInputSchema.index({ companyId: 1, locationId: 1, createdAt: -1 });
BatchInputSchema.index({ batchStatus: 1 });
BatchInputSchema.index({ priority: 1 });

export default models.BatchInput || model('BatchInput', BatchInputSchema);
