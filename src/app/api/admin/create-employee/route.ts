import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { signIn } from "next-auth/react";
import { authOptions } from "@/lib/auth";
import {
  Employee,
  CompanyRole,
  ILocation,
  IModuleAccess,
} from "@/models/employee";
import { User, Company } from "@/models/user";
import connectDB from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { adminEmployeeNavData } from "@/data/navigationData";
import { AuditLog } from "@/models/audit";
import { NavItem } from "@/types";

// Interface for request body
interface CreateEmployeeRequest {
  employeeId: string;
  userId: string;
  password?: string;
  name: string;
  companyRoles: string[];
  companyId: string;
  locationIds: string[];
  moduleAccess: {
    moduleId?: string;
    modulePath: string;
    moduleName: string;
    permissions: string[];
  }[];
}

// Helper function to normalize values for comparison
const normalizeValue = (value: any): any => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return value;
};

// Helper function for deep array comparison
const arraysEqual = (arr1: any[], arr2: any[]): boolean => {
  if (arr1.length !== arr2.length) return false;
  const sorted1 = [...arr1].sort();
  const sorted2 = [...arr2].sort();
  return JSON.stringify(sorted1) === JSON.stringify(sorted2);
};

// Helper function to detect changes
const detectChanges = (
  oldData: any,
  newData: CreateEmployeeRequest,
  companyName: string,
  locations: ILocation[]
): any[] => {
  const changes: any[] = [];

  // Compare userId
  if (normalizeValue(oldData.userId) !== normalizeValue(newData.userId)) {
    changes.push({
      field: "userId",
      oldValue: normalizeValue(oldData.userId) || "None",
      newValue: normalizeValue(newData.userId) || "None",
      dataType: "string",
    });
  }

  // Compare name
  if (normalizeValue(oldData.name) !== normalizeValue(newData.name)) {
    changes.push({
      field: "name",
      oldValue: normalizeValue(oldData.name) || "None",
      newValue: normalizeValue(newData.name) || "None",
      dataType: "string",
    });
  }

  // Compare companyId
  if (
    normalizeValue(oldData.companies?.[0]?.companyId) !==
    normalizeValue(newData.companyId)
  ) {
    changes.push({
      field: "company",
      oldValue: normalizeValue(oldData.companies?.[0]?.name) || "None",
      newValue: companyName || "None",
      dataType: "string",
    });
  }

  // Compare companyRoles
  const oldRoles = (oldData.companyRoles || []).filter((role: any) => role);
  const newRoles = (newData.companyRoles || []).filter((role: any) => role);
  if (!arraysEqual(oldRoles, newRoles)) {
    changes.push({
      field: "companyRoles",
      oldValue: oldRoles.length > 0 ? oldRoles : ["None"],
      newValue: newRoles.length > 0 ? newRoles : ["None"],
      dataType: "array",
    });
  }

  // Compare locationIds
  const oldLocationIds = (oldData.companies?.[0]?.locations || [])
    .map((loc: ILocation) => loc.locationId)
    .filter((id: any) => id);
  const newLocationIds = (newData.locationIds || []).filter((id: any) => id);
  if (!arraysEqual(oldLocationIds, newLocationIds)) {
    const oldLocationNames =
      oldLocationIds.length > 0
        ? oldData.companies?.[0]?.locations
            .map((loc: ILocation) => loc.name)
            .filter((name: any) => name)
        : ["None"];
    const newLocationNames =
      newLocationIds.length > 0
        ? locations
            .map((loc: ILocation) => loc.name)
            .filter((name: any) => name)
        : ["None"];
    changes.push({
      field: "locations",
      oldValue: oldLocationNames,
      newValue: newLocationNames,
      dataType: "array",
    });
  }

  // Compare moduleAccess
  const oldModules = (oldData.moduleAccess || [])
    .map((m: IModuleAccess) => m.modulePath)
    .filter((path: any) => path);
  const newModules = (newData.moduleAccess || [])
    .map((m) => m.modulePath)
    .filter((path: any) => path);
  if (!arraysEqual(oldModules, newModules)) {
    changes.push({
      field: "moduleAccess",
      oldValue: oldModules.length > 0 ? oldModules : ["None"],
      newValue: newModules.length > 0 ? newModules : ["None"],
      dataType: "array",
    });
  }

  return changes;
};


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const adminCompanies = session.user.companies;
    if (!adminCompanies || adminCompanies.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const companyIds = adminCompanies.map(company => company.companyId);

    // This is the critical query
    const employees = await Employee.find({
      'companies.companyId': { $in: companyIds }
    });

    return NextResponse.json({ data: employees }, { status: 200 });

  } catch (error: unknown) {
    console.error("Fetch employees error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 401 }
      );
    }

    const body: CreateEmployeeRequest = await request.json();
    const {
      employeeId,
      userId,
      password,
      name,
      companyRoles,
      companyId,
      locationIds,
      moduleAccess,
    } = body;

    // Validate required fields
    if (!employeeId || !userId || !name || !companyId) {
      const missingFields = [];
      if (!employeeId) missingFields.push("employeeId");
      if (!userId) missingFields.push("userId");
      if (!name) missingFields.push("name");
      if (!companyId) missingFields.push("companyId");
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }

    await connectDB();

    // Check for existing employee
    const existingEmployee = await Employee.findOne({
      $or: [
        { employeeId: employeeId.toUpperCase() },
        { userId: userId.toLowerCase() },
      ],
    });

    if (existingEmployee) {
      return NextResponse.json(
        { error: "Employee or User ID already exists" },
        { status: 400 }
      );
    }

    // Fetch company and location details before creating user
    const company = await Company.findOne({ companyId });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Get location objects from the company
    const locations = company.locations.filter((loc: ILocation) =>
      locationIds.includes(loc.locationId)
    );

    if (locations.length !== locationIds.length) {
      return NextResponse.json(
        { error: "Invalid location IDs provided" },
        { status: 400 }
      );
    }

    // Create new user if password is provided
    let user;
    if (password) {
      user = new User({
        userId: userId.toLowerCase(),
        name,
        password, // Assume password hashing is handled in User model
        companies: [{ 
          companyId, 
          name: company.name, // Add company name
          locations: locations // Use location objects, not just IDs
        }],
        role: "employee",
      });
      await user.save();
    } else {
      // Fetch existing user or handle as needed
      user = await User.findOne({ userId: userId.toLowerCase() });
      if (!user) {
        return NextResponse.json(
          { error: "User not found and no password provided" },
          { status: 400 }
        );
      }
    }

    // Create new employee
    const newEmployee = new Employee({
      employeeId: employeeId.toUpperCase(),
      userId: userId.toLowerCase(),
      name,
      password: password || "defaultPassword", // Provide password or default
      role: "employee", // Add required role field
      companyRoles,
      companies: [{ 
        companyId, 
        name: company.name,
        locations: locations 
      }],
      moduleAccess,
    });

    await newEmployee.save();

    // Log audit
    const auditDetails = {
      performedBy: session.user.id,
      performedByName: session.user.userId || session.user.email || "Unknown User",
      message: `Employee ${name} created by ${session.user.userId || session.user.email}`,
      createdFields: {
        userId,
        name,
        company: company?.name || companyId,
        roles: companyRoles,
        locations: locations.map((loc : ILocation) => loc.name),
      },
      sessionInfo: {
        userId: session.user.id,
        name:session.user.userId,
        userEmail: session.user.email,
        userRole: session.user.role,
        timestamp: new Date().toISOString(),
      },
    };

    const auditEntry = new AuditLog({
      action: "CREATE",
      employeeId: employeeId.toUpperCase(),
      userId: userId.toLowerCase(),
      timestamp: new Date(),
      details: auditDetails,
      performedBy: session.user.id,
    });

    await auditEntry.save();

    return NextResponse.json(
      { message: "Employee created successfully", data: newEmployee },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating employee:", error);
    let errorMessage = "Internal server error";
    let errorDetails = "Unknown error";

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || error.message;
    }

    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      employeeId,
      userId,
      password,
      name,
      companyRoles,
      companyId,
      locationIds,
      moduleAccess,
    } = (await request.json()) as CreateEmployeeRequest;

    if (!employeeId || !userId || !name || !companyId) {
      return NextResponse.json(
        { error: "Required fields are missing" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the employee to update
    const employee = await Employee.findOne({
      employeeId: employeeId.toUpperCase(),
    });
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Validate userId
    if (employee.userId !== userId.toLowerCase()) {
      const existingUser = await Employee.findOne({
        userId: userId.toLowerCase(),
      });
      if (existingUser) {
        return NextResponse.json(
          { error: "User ID already exists for another employee" },
          { status: 400 }
        );
      }
    }
    // Validate company roles  
    const validRoles = await CompanyRole.find({
      roleId: { $in: companyRoles },
    });
    if (validRoles.length !== companyRoles.length) {
      return NextResponse.json(
        { error: "Invalid company roles provided" },
        { status: 400 }
      );
    }

    // Validate company and locations
    const company = await Company.findOne({
      companyId: companyId.toUpperCase(),
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const companyLocations = company.locations.filter((loc: ILocation) =>
      locationIds.includes(loc.locationId)
    );
    if (companyLocations.length !== locationIds.length) {
      return NextResponse.json(
        { error: "Invalid location IDs provided" },
        { status: 400 }
      );
    }

    // Validate and process module access
    const extractPaths = (navItems: NavItem[]): string[] => {
  const paths: string[] = [];

  for (const item of navItems) {
    if (item.path) {
      paths.push(item.path);
    }

    if (item.children && item.children.length > 0) {
      paths.push(...extractPaths(item.children));
    }
  }

  return paths;
};

const validModules: string[] = extractPaths(adminEmployeeNavData);

    const processedModuleAccess: IModuleAccess[] = moduleAccess.map(
      (access) => {
        if (!validModules.includes(access.modulePath)) {
          throw new Error(`Invalid module path: ${access.modulePath}`);
        }
        return {
          moduleId: access.moduleId || uuidv4(),
          modulePath: access.modulePath,
          moduleName: access.moduleName,
          permissions:
            access.permissions.length > 0 ? access.permissions : ["read"],
        };
      }
    );

    // Detect changes for audit logging
    const changes = detectChanges(
      employee,
      {
        employeeId,
        userId,
        name,
        companyRoles,
        companyId,
        locationIds,
        moduleAccess,
      },
      company.name,
      companyLocations
    );

    // Update employee details
    employee.userId = userId.toLowerCase();
    employee.name = name;
    if (password) {
      employee.password = password;
    }
    employee.companyRoles = companyRoles;
    employee.companies = [
      {
        companyId: company.companyId,
        name: company.name,
        locations: companyLocations,
      },
    ];
    employee.moduleAccess = processedModuleAccess;

    await employee.save();

    // Create audit log for update only if there are actual changes
    if (changes.length > 0) {
      await AuditLog.create({
        action: "UPDATE",
        employeeId: employee.employeeId,
        userId: session.user.id, // Use session.user.id for performedBy
        performedBy: session.user.id, // Explicitly set performedBy
        timestamp: new Date(),
        details: {
          message: `Employee updated by ${
            session.user.userId || session.user.email || "Unknown User"
          } - ${changes.length} field(s) changed`,
          employeeId: employee.employeeId,
          userId: employee.userId,
          name: employee.name,
          changes: changes,
        },
      });
    }

    // Update User document
    let user = await User.findOne({ userId: userId.toLowerCase() });
    if (!user) {
      user = new User({
        userId: userId.toLowerCase(),
        password: password || employee.password,
        role: "employee",
        email: `${userId.toLowerCase()}@company.com`,
        companies: [
          {
            companyId: company.companyId,
            name: company.name,
            locations: companyLocations,
          },
        ],
      });
      await user.save();
    } else {
      const companyExists = user.companies.some(
        (c: any) => c.companyId === company.companyId
      );
      if (!companyExists) {
        user.companies.push({
          companyId: company.companyId,
          name: company.name,
          locations: companyLocations,
        });
      } else {
        const companyInUser = user.companies.find(
          (c: any) => c.companyId === company.companyId
        );
        companyInUser.locations = companyLocations;
      }
      if (password) {
        user.password = password;
      }
      await user.save();
    }

    return NextResponse.json({
      message: "Employee updated successfully",
      employee: {
        employeeId: employee.employeeId,
        userId: employee.userId,
        name: employee.name,
        companyRoles: employee.companyRoles,
        companyId: employee.companies[0].companyId,
        company: employee.companies[0].name,
        locations: employee.companies[0].locations,
        moduleAccess: employee.moduleAccess,
        role: employee.role,
      },
    });
  } catch (error: unknown) {
    console.error("Update employee error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
