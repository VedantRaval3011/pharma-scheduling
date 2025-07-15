export interface User {
  userId: string;
  role: "super_admin" | "admin" | "employee";
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
  roles?: ("super_admin" | "admin" | "employee")[];
}

export const superAdminNavData: NavItem[] = [
  {
    label: "Companies",
    children: [
      {
        label: "Manage Companies",
        children: [
          {
            label: "Create Company",
            description: "Add new companies to the system",
            path: "/dashboard/super-admin/companies/create",
          },
          {
            label: "View All Companies",
            description: "List and manage all companies",
            path: "/dashboard/super-admin/companies",
          },
          {
            label: "Company Settings",
            description: "Configure company-specific settings",
            path: "/dashboard/super-admin/companies/settings",
          },
        ],
      },
      {
        label: "System Administration",
        children: [
          {
            label: "Global Settings",
            description: "System-wide configuration",
            path: "/dashboard/super-admin/settings",
          },
          {
            label: "System Logs",
            description: "View system activity logs",
            path: "/dashboard/super-admin/logs",
          },
        ],
      },
    ],
  },
  {
    label: "Users",
    children: [
      {
        label: "Admin Management",
        children: [
          {
            label: "Create Admin",
            description: "Create new company administrators",
            path: "/dashboard/super-admin/users/create-admin",
          },
          {
            label: "Manage Admins",
            description: "View and manage all admins",
            path: "/dashboard/super-admin/users/admins",
          },
        ],
      },
    ],
  },
];

export const adminEmployeeNavData: NavItem[] = [
  {
    label: "Master",
    children: [
      {
        label: "Admin",
        children: [
          {
            label: "Admin Details",
            description: "View & edit admin profile details",
            path: "/dashboard/admin/details",
          },
          {
            label: "Kill User",
            description: "Forcefully log out a user or terminate sessions",
            path: "/dashboard/admin/kill-user",
          },
          {
            label: "Role Assignment",
            description: "Assign roles to users",
            path: "/dashboard/admin/role-assignment",
          },
          {
            label: "Role Creation",
            description: "Create new roles with specific permissions",
            path: "/dashboard/admin/roles/create",
          },
          {
            label: "Change Password",
            description: "Change password for admin or employees",
            path: "/dashboard/admin/password/change",
          },
          {
            label: "Audit Logs",
            description: "View login, password change, and access history",
            path: "/dashboard/admin/audit/logs",
          },
          {
            label: "Manage Employees",
            description: "Manage the list of currently active employees",
            path: "/dashboard/admin/employees",
          },
          {
            label: "Manage Roles",
            description: "Manage the roles of employees",
            path: "/dashboard/admin/roles",
          },
        ],
      },

      {
        label: "Mobile Phase Master",
        path: "/dashboard/mobile-phase",
      },
      {
        label: "Master MFC Methods",
        children: [
          {
            label: "Product Code Master",
            path: "/dashboard/mfc-methods/product-code-master",
          },
        ],
      },
      {
        label: "Master Column",
        path: "/dashboard/columns",
      },
      {
        label: "Test Master",
        children: [
          {
            label: "Finished Products",
            children: [
              {
                label: "ASSAY",
                path: "/dashboard/test-master/finished-products/assay",
              },
              {
                label: "Related Substances / Organic Impurity",
                path: "/dashboard/test-master/finished-products/impurity",
              },
            ],
          },
          {
            label: "Bulk Products",
            children: [
              {
                label: "ASSAY",
                path: "/dashboard/test-master/bulk/assay",
              },
            ],
          },
          {
            label: "Stability",
            children: [
              {
                label: "Accelerated Stability",
                path: "/dashboard/test-master/stability/accelerated",
              },
              {
                label: "Real Time Stability",
                path: "/dashboard/test-master/stability/realtime",
              },
            ],
          },
          {
            label: "Raw Materials",
            children: [
              {
                label: "ASSAY",
                path: "/dashboard/test-master/raw-materials/assay",
              },
              {
                label: "Related Substances / Organic Impurity",
                path: "/dashboard/test-master/raw-materials/impurity",
              },
            ],
          },
          {
            label: "Analytical Method Validation (AMV)",
            path: "/dashboard/test-master/amv",
          },
          {
            label: "Process Validation (PV)",
            path: "/dashboard/test-master/pv",
          },
        ],
      },
      {
        label: "Raw Material Master",
        path: "/dashboard/raw-material-master",
      },
    ],
  },
  {
    label: "Batches",
    children: [
      {
        label: "Batch Input",
        path: "/dashboard/batches/input",
      },
      {
        label: "Batch Suggestions",
        path: "/dashboard/batches/suggestions",
      },
    ],
  },
  {
    label: "Tests",
    children: [
      {
        label: "Completed Tests",
        path: "/dashboard/tests/completed",
      },
      {
        label: "Outsourced Tests",
        path: "/dashboard/tests/outsourced",
      },
    ],
  },
  {
    label: "Analysis",
    children: [
      {
        label: "Time Saving Analysis",
        path: "/dashboard/analysis/time-saving",
      },
      {
        label: "Summary",
        path: "/dashboard/analysis/summary",
      },
    ],
  },
];

// Remove admin-specific items for employee role
export const employeeNavData: NavItem[] = adminEmployeeNavData.map((item) => {
  if (item.label === "Master") {
    return {
      ...item,
      children: item.children?.map((child) => {
        if (child.label === "Accounts") {
          return {
            ...child,
            children: child.children?.filter(
              (subChild) =>
                ![
                  "Working Employees",
                  "Change Passwords",
                  "Access Control",
                ].includes(subChild.label)
            ),
          };
        }
        return child;
      }),
    };
  }
  return item;
});
