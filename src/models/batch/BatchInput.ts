import mongoose from "mongoose";

const testSchema = new mongoose.Schema(
  {
    testTypeId: { type: String, required: true }, // from MFC
    testName: { type: String, required: true }, // optional human-readable

    // Config from MFC
    columnCode: String,
    mobilePhaseCodes: [String],
    detectorTypeId: String,
    pharmacopoeialId: String,
    blankInjection: Number,
    standardInjection: Number,
    sampleInjection: Number,
    bracketingFrequency: Number,
    runTime: Number,
    washTime: Number,

    // User-specific flags
    outsourced: { type: Boolean, default: false },
    continueTests: { type: Boolean, default: false },

    // New: status tracking
    status: {
      type: String,
      enum: ["Not Started", "In Progress", "Closed"],
      default: "Not Started",
    },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
  },
  { _id: false }
);

const batchInputSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true },
    locationId: { type: String, required: true },
    
    // Product details
    productCode: { type: String, required: true },
    productName: { type: String, required: true },
    genericName: { type: String, required: true },
    pharmacopialToUse: { type: String }, // Add this field for pharmacopoeial filtering
    
    // Batch details
    batchNumber: { type: String, required: true },
    manufacturingDate: { type: Date, required: true },
    priority: {
      type: String,
      enum: ["Urgent", "High", "Normal"],
      required: true,
    },
    daysForUrgency: { type: Number, required: true },
    
    // MFC & Department
    mfcNumber: { type: String, required: true },
    departmentName: { type: String, required: true },
    
    // Sample type - Changed to array for multi-select
    typeOfSample: {
      type: [String],
      enum: [
        "Bulk",
        "FP", 
        "Stability Partial",
        "Stability Final",
        "AMV",
        "PV",
        "CV",
      ],
      required: true,
      validate: {
        validator: function(v: string[]) {
          return v && v.length > 0;
        },
        message: 'At least one sample type must be selected'
      }
    },
    
    // Tests
    tests: [testSchema],
    
    // Batch level status (optional)
    batchStatus: {
      type: String,
      enum: ["Not Started", "In Progress", "Closed"],
      default: "Not Started",
    },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.BatchInput ||
  mongoose.model("BatchInput", batchInputSchema);