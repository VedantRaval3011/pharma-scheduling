import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import type { CallbackError } from 'mongoose';

// Interfaces for type safety
interface ILocation {
  locationId: string;
  name: string;
}

interface ICompany {
  companyId: string;
  name: string;
  locations: ILocation[];
}

interface ICompanyRole {
  roleId: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IModuleAccess {
  moduleId: string;
  modulePath: string;
  moduleName: string;
  permissions: string[];
}

interface IEmployee extends Document {
  employeeId: string;
  userId: string;
  name: string;
  role: 'super_admin' | 'admin' | 'employee';
  companyRoles: string[]; // References to CompanyRole IDs
  companies: ICompany[];
  moduleAccess: IModuleAccess[];
  email?: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getCompanyNames(): string[];
  getLocationsByCompany(companyId: string): ILocation[];
  getAllLocations(): ILocation[];
  hasAccessToCompany(companyId: string): boolean;
  hasAccessToLocation(locationId: string): boolean;
  hasModuleAccess(modulePath: string): boolean;
}

// CompanyRole Schema (Master for roles)
const companyRoleSchema = new Schema<ICompanyRole>({
  roleId: {
    type: String,
    default: () => uuidv4(),
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  description: {
    type: String,
    trim: true,
  },
  createdBy: {
    type: String,
    required: true,
  }
}, {
  timestamps: true,
});

// Location subdocument schema
const locationSchema = new Schema<ILocation>({
  locationId: {
    type: String,
    default: () => uuidv4(),
    required: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  }
}, { _id: false });

// Company subdocument schema
const companySchema = new Schema<ICompany>({
  companyId: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  locations: [locationSchema],
}, { _id: false });

// Module Access subdocument schema
const moduleAccessSchema = new Schema<IModuleAccess>({
  moduleId: {
    type: String,
    default: () => uuidv4(),
    required: true,
  },
  modulePath: {
    type: String,
    required: true,
    trim: true,
  },
  moduleName: {
    type: String,
    required: true,
    trim: true,
  },
  permissions: [{
    type: String,
    enum: ['read', 'write', 'delete'],
    default: ['read'],
  }],
}, { _id: false });

// Employee schema
const employeeSchema = new Schema<IEmployee>({
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  userId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'employee'],
    required: true,
    index: true,
  },
  companyRoles: [{
    type: String,
    
  }],
  companies: [companySchema],
  moduleAccess: [moduleAccessSchema],
  email: {
    type: String,
    sparse: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
  },
}, {
  timestamps: true,
});

// Indexes for better performance
employeeSchema.index({ 'companies.companyId': 1 });
employeeSchema.index({ 'companies.locations.locationId': 1 });
employeeSchema.index({ userId: 1, role: 1, employeeId: 1 });

// Hash password before saving
employeeSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as CallbackError);
  }
});

// Methods
employeeSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

employeeSchema.methods.getCompanyNames = function(): string[] {
  return this.companies.map((company: ICompany) => company.name);
};

employeeSchema.methods.getLocationsByCompany = function(companyId: string): ILocation[] {
  const company = this.companies.find((c: ICompany) => c.companyId === companyId.toUpperCase());
  return company ? company.locations : [];
};

employeeSchema.methods.getAllLocations = function(): ILocation[] {
  return this.companies.reduce((locations: ILocation[], company: ICompany) => {
    return locations.concat(company.locations);
  }, []);
};

employeeSchema.methods.hasAccessToCompany = function(companyId: string): boolean {
  return this.companies.some((company: ICompany) => company.companyId === companyId.toUpperCase());
};

employeeSchema.methods.hasAccessToLocation = function(locationId: string): boolean {
  return this.companies.some((company: ICompany) => 
    company.locations.some((location: ILocation) => location.locationId === locationId)
  );
};

employeeSchema.methods.hasModuleAccess = function(modulePath: string): boolean {
  return this.moduleAccess.some((module: IModuleAccess) => module.modulePath === modulePath);
};

// Static methods
employeeSchema.statics.findByCompany = function(companyId: string) {
  return this.find({ 'companies.companyId': companyId.toUpperCase() });
};

employeeSchema.statics.findByLocation = function(locationId: string) {
  return this.find({ 'companies.locations.locationId': locationId });
};

// Export models
export const Employee = mongoose.models.Employee || mongoose.model<IEmployee>('Employee', employeeSchema);
export const CompanyRole = mongoose.models.CompanyRole || mongoose.model<ICompanyRole>('CompanyRole', companyRoleSchema);

// Export types
export type { IEmployee, ICompany, ILocation, ICompanyRole, IModuleAccess };