// types/index.ts
export interface User {
  userId: string;
  role: 'super_admin' | 'admin' | 'employee';
  companyId?: string;
  company?: string;
  email?: string;
}

export interface Company {
  companyId: string;
  name: string;
  createdBy: string;
  createdAt: Date;
}

export interface NavItem {
  label: string;
  description?: string;
  children?: NavItem[];
  path?: string;
  roles?: ('super_admin' | 'admin' | 'employee')[];
}