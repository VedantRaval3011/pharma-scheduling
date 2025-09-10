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
            label: "Series Master",
            description: "Create and manage series for various purposes",
            path: "/dashboard/admin/series-master",
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
        label: "Chemical Master",
        path: "/dashboard/chemical",
      },
      {
        label: "MFC Master",
        path: "/dashboard/mfc-master",
      },
      {
        label: "API Master",
        path: "/dashboard/api-master",
      },
      {
        label: "Department Master",
        path: "/dashboard/department-master",
      },
      {
        label: "Test Type Master",
        path: "/dashboard/test-type-master",
      },
      {
        label: "Pharmacopeial Master",
        path: "/dashboard/pharmacopeial",
      },
      {
        label: "Column Master",
        path: "/dashboard/columns",
      },
       {
        label: "Prefix/Suffix Master",
        path: "/dashboard/prefixAndSuffix",
      },
      {
        label: "Make Master",
        path: "/dashboard/make-master",
      },
      {
        label: "Detector Type Master",
        path: "/dashboard/detector-type-master",
      },
      {
        label: "Product",
        children: [
          {
            label: "Product Master",
            path: "/dashboard/product/product-master",
          },
          {
            label: "Make Master ",
            path: "/dashboard/product/make-master",
          }
        ]
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
