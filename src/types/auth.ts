export interface User {
  _id: string;
  userId: string;
  password: string;
  role: 'super_admin' | 'admin' | 'employee';
  companyId?: string;
  company?: string;
  email?: string; // Only for super admin
  createdAt: Date;
  updatedAt: Date;
}

export interface Company {
  _id: string;
  companyId: string;
  name: string;
  createdBy: string; // super admin ID
  createdAt: Date;
}

export interface LoginCredentials {
  userId?: string;
  email?: string;
  password: string;
  companyId?: string;
  company?: string;
}

export interface CreateAdminData {
  userId: string;
  password: string;
  companyId: string;
  company: string;
}

export interface CreateEmployeeData {
  userId: string;
  password: string;
  companyId: string;
}

export type UserRole = 'super_admin' | 'admin' | 'employee';

// Session types


export interface SessionUser {
  _id: string;
  userId: string;
  password?: string;
  role: UserRole;
  companies: { companyId: string; name: string; locations: { locationId: string; name: string }[] }[];
  email?: string;
  createdAt: string;
  updatedAt: string;
}


declare module "next-auth" {
  
  interface User {
    id: string;
    userId: string;
    role: string;
    companyId?: string;
    company?: string;
    email?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    userId: string;
    role: string;
    companyId?: string;
    company?: string;
    email?: string;
  }
}