import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";
import type { CallbackError } from "mongoose";

import { IModuleAccess } from '@/models/employee';

export interface SessionUser {
  id: string;
  userId: string;
  role: string;
  companies: { companyId: string; name: string; locations: { locationId: string; name: string }[] }[];
  email?: string;
  moduleAccess?: IModuleAccess[];  // Add this line
}
// Define interfaces for better type safety
interface ILocation {
  locationId: string;
  name: string;
}

interface ICompany {
  companyId: string;
  name: string;
  locations: ILocation[];
}

interface IUser extends Document {
  userId: string;
  password: string;
  role: "super_admin" | "admin" | "employee";
  companies: ICompany[];
  email?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getCompanyNames(): string[];
  getLocationsByCompany(companyId: string): ILocation[];
  getAllLocations(): ILocation[];
  hasAccessToCompany(companyId: string): boolean;
  hasAccessToLocation(locationId: string): boolean;
}

// Location subdocument schema
const locationSchema = new Schema<ILocation>(
  {
    locationId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

// Company subdocument schema
const companySchema = new Schema<ICompany>(
  {
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
    locations: {
      type: [locationSchema],
      required: true,
      validate: {
        validator: function (locations: ILocation[]) {
          return locations.length > 0;
        },
        message: "Company must have at least one location",
      },
    },
  },
  { _id: false }
);

// Main user schema
const userSchema = new Schema<IUser>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["super_admin", "admin", "employee"],
      required: true,
      index: true,
    },
    companies: {
      type: [companySchema],
      required: function () {
        return this.role !== "super_admin";
      },
      validate: {
        validator: function (companies: ICompany[]) {
          if (this.role === "super_admin") return true;
          return companies.length > 0;
        },
        message: "Non-super-admin users must have at least one company",
      },
    },
    email: {
      type: String,
      sparse: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
userSchema.index({ "companies.companyId": 1 });
userSchema.index({ "companies.locations.locationId": 1 });
userSchema.index({ userId: 1, role: 1 });

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as CallbackError);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get all company names
userSchema.methods.getCompanyNames = function (): string[] {
  return this.companies.map((company: ICompany) => company.name);
};

// Method to get locations by company ID
userSchema.methods.getLocationsByCompany = function (
  companyId: string
): ILocation[] {
  const company = this.companies.find(
    (c: ICompany) => c.companyId === companyId.toUpperCase()
  );
  return company ? company.locations : [];
};

// Method to get all locations across all companies
userSchema.methods.getAllLocations = function (): ILocation[] {
  return this.companies.reduce((locations: ILocation[], company: ICompany) => {
    return locations.concat(company.locations);
  }, []);
};

// Method to check if user has access to a company
userSchema.methods.hasAccessToCompany = function (companyId: string): boolean {
  return this.companies.some(
    (company: ICompany) => company.companyId === companyId.toUpperCase()
  );
};

// Method to check if user has access to a location
userSchema.methods.hasAccessToLocation = function (
  locationId: string
): boolean {
  return this.companies.some((company: ICompany) =>
    company.locations.some(
      (location: ILocation) => location.locationId === locationId
    )
  );
};

// Virtual field to get company count
userSchema.virtual("companyCount").get(function () {
  return this.companies.length;
});

// Virtual field to get total location count
userSchema.virtual("locationCount").get(function () {
  return this.companies.reduce((count: number, company: ICompany) => {
    return count + company.locations.length;
  }, 0);
});

// Transform function to include virtuals in JSON
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

// Static method to find users by company
userSchema.statics.findByCompany = function (companyId: string) {
  return this.find({ "companies.companyId": companyId.toUpperCase() });
};

// Static method to find users by location
userSchema.statics.findByLocation = function (locationId: string) {
  return this.find({ "companies.locations.locationId": locationId });
};

// Company model (separate collection)
interface ICompanyDocument extends Document {
  companyId: string;
  name: string;
  locations: { locationId: string; name: string }[];
  createdBy: string;
  userIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

const companyDocumentSchema = new Schema<ICompanyDocument>(
  {
    companyId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    locations: [
      {
        locationId: {
          type: String,
          required: true,
          trim: true,
        },
        name: {
          type: String,
          required: true,
          trim: true,
        },
        employeeId: { type: String, unique: true },
        companyRoles: [{ type: String }],
        moduleAccess: [
          {
            modulePath: String,
            moduleName: String,
            permissions: [String],
          },
        ],
      },
    ],
    createdBy: {
      type: String,
      required: true,
    },
    userIds: [
      {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Export models
export const User =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);
export const Company =
  mongoose.models.Company ||
  mongoose.model<ICompanyDocument>("Company", companyDocumentSchema);

// Export types
export type { IUser, ICompany, ILocation, ICompanyDocument };
