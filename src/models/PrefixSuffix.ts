import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema({
  action: { type: String, required: true, enum: ['CREATE', 'UPDATE', 'DELETE'] },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  companyId: { type: String, required: true },
  locationId: { type: String, required: true },
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
});

const prefixSuffixSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, required: true, enum: ['PREFIX', 'SUFFIX'] },
  companyId: { type: String, required: true },
  locationId: { type: String, required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Check if models already exist to avoid OverwriteModelError
export const PrefixSuffix = mongoose.models.PrefixSuffix || mongoose.model('PrefixSuffix', prefixSuffixSchema);
export const Audit = mongoose.models.Audit || mongoose.model('Audit', auditSchema);
  