import { IModuleAccess } from "@/models/employee";

export type UserRole = 'super_admin' | 'admin' | 'employee';
export type UserStatus = 'active' | 'inactive';

// Base User interface matching Mongoose model
export interface IUser {
  _id: string;
  userId: string;
  password?: string;
  role: UserRole;
  companies: { companyId: string; name: string; locations: { locationId: string; name: string }[] }[];
  email?: string;
  createdAt: string;
  updatedAt: string;
}

// Extended User interface for frontend
export interface IUserWithDetails extends IUser {
  name?: string;
  department?: string;
  status?: UserStatus;
  lastLogin?: string;
  profileImage?: string;
  phoneNumber?: string;
  position?: string;
  isActive?: boolean;
}

// Session user interface for authentication

export interface SessionUser {
  id: string;
  userId: string;
  role: UserRole;
  companies: { companyId: string; name: string; locations: { locationId: string; name: string }[] }[];
  email?: string;
  moduleAccess?: IModuleAccess[];  // Add this line
}

// Complete session interface
export interface UserSession {
  user: SessionUser;
  expires: string;
}

// API Response interfaces
export interface UsersListResponse {
  users: IUserWithDetails[];
  totalCount?: number;
  page?: number;
  limit?: number;
}

export interface UserResponse {
  user: IUserWithDetails;
}

export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

// API request interfaces
export interface CreateUserRequest {
  userId: string;
  password: string;
  role: UserRole;
  companies: { companyId: string; name: string; locations: { locationId: string; name: string }[] }[];
  email?: string;
  name?: string;
  department?: string;
}

export interface UpdateUserRequest {
  userId?: string;
  role?: UserRole;
  companies?: { companyId: string; name: string; locations: { locationId: string; name: string }[] }[];
  email?: string;
  name?: string;
  department?: string;
  status?: UserStatus;
}

export interface LoginRequest {
  userId: string;
  password: string;
  companyId?: string;
  company?: string;
  locationId?: string;
  location?: string;
}

export interface LoginResponse {
  user: SessionUser;
  token?: string;
  message: string;
}

// Filter and search interfaces
export interface UserFilters {
  role?: UserRole;
  companyId?: string;
  status?: UserStatus;
  department?: string;
  search?: string;
}

export interface UserTableColumn {
  key: keyof IUserWithDetails;
  label: string;
  sortable?: boolean;
  render?: (user: IUserWithDetails) => React.ReactNode;
}

// Dashboard state interface
export interface DashboardState {
  users: IUserWithDetails[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  currentUser: SessionUser | null;
  filters: UserFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

// Company interface
export interface ICompany {
  _id: string;
  companyId: string;
  name: string;
  locations: { locationId: string; name: string }[];
  description?: string;
  industry?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Location interface
export interface ILocation {
  _id: string;
  locationId: string;
  name: string;
  companyId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Permission checking utilities type
export type PermissionCheck = (user: SessionUser, targetUser?: IUserWithDetails) => boolean;

// Utility types for role-based access
export type SuperAdminActions = 'view_all_users' | 'create_admin' | 'delete_user' | 'manage_companies' | 'manage_locations';
export type AdminActions = 'view_company_users' | 'create_employee' | 'edit_employee' | 'deactivate_employee';
export type EmployeeActions = 'view_own_profile' | 'edit_own_profile';

export interface RolePermissions {
  super_admin: SuperAdminActions[];
  admin: AdminActions[];
  employee: EmployeeActions[];
}

// Form validation types
export interface UserFormErrors {
  userId?: string;
  password?: string;
  email?: string;
  companies?: string;
  role?: string;
  name?: string;
}

export interface UserFormData {
  userId: string;
  password: string;
  confirmPassword?: string;
  email: string;
  name: string;
  role: UserRole;
  companies: { companyId: string; name: string; locations: { locationId: string; name: string }[] }[];
  department: string;
}