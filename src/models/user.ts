import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { CallbackError } from 'mongoose';


interface IUser extends Document {
  userId: string;
  password: string;
  role: 'super_admin' | 'admin' | 'employee';
  companyId?: string;
  company?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  userId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'employee'],
    required: true
  },
  companyId: {
    type: String,
    sparse: true,
    uppercase: true,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    sparse: true,
    lowercase: true,
    trim: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as CallbackError);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);