import mongoose from "mongoose";

const hplcSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, "HPLC/UPLC type is required"],
      enum: ["HPLC", "UPLC"],
      trim: true,
    },
    detector: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "DetectorType",
      required: [true, "At least one detector is required"],
      validate: {
        validator: function(v: mongoose.Types.ObjectId[]) {
          // Now v is the entire array
          return Array.isArray(v) && v.length > 0 && v.every(id => mongoose.Types.ObjectId.isValid(id));
        },
        message: 'Detector must be an array of valid ObjectIds with at least one detector'
      }
    },
    internalCode: {
      type: String,
      required: [true, "Internal code is required"],
      trim: true,
      maxlength: [50, "Internal code cannot exceed 50 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    companyId: {
      type: String,
      required: [true, "Company ID is required"],
      trim: true,
    },
    locationId: {
      type: String,
      required: [true, "Location ID is required"],
      trim: true,
    },
    createdBy: {
      type: String,
      required: [true, "Created by is required"],
    },
    updatedBy: {
      type: String,
      required: [true, "Updated by is required"],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Pre-save middleware to validate detector references
hplcSchema.pre('save', async function(next) {
  if (this.detector && this.detector.length > 0) {
    try {
      const DetectorType = mongoose.model('DetectorType');
      for (let detectorId of this.detector) {
        const exists = await DetectorType.findById(detectorId);
        if (!exists) {
          throw new Error(`Detector with ID ${detectorId} does not exist`);
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        return next(new Error(`Failed to validate detector references: ${error.message}`));
      }
      return next(new Error(`Failed to validate detector references: ${String(error)}`));
    }
  }
  next();
});

// Pre-update middleware to validate detector references for updates
hplcSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], async function(next) {
  const update = this.getUpdate() as any;
  
  if (update && update.detector && Array.isArray(update.detector) && update.detector.length > 0) {
    try {
      const DetectorType = mongoose.model('DetectorType');
      for (let detectorId of update.detector) {
        const exists = await DetectorType.findById(detectorId);
        if (!exists) {
          throw new Error(`Detector with ID ${detectorId} does not exist`);
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        return next(new Error(`Failed to validate detector references: ${error.message}`));
      }
      return next(new Error(`Failed to validate detector references: ${String(error)}`));
    }
  }
  next();
});

// Compound index to ensure uniqueness per company/location
hplcSchema.index(
  { internalCode: 1, companyId: 1, locationId: 1 },
  { unique: true }
);

// Index for better query performance
hplcSchema.index({ companyId: 1, locationId: 1 });

const HPLC = mongoose.models.HPLC || mongoose.model("HPLC", hplcSchema);
export default HPLC;