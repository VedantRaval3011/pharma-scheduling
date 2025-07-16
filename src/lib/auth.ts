import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { User } from "@/models/user";
import { Company } from "@/models/company";
import { Location } from "@/models/location";
import { Employee } from "@/models/employee";
import connectDB from "./db";
import { SessionUser } from "@/types/user";
import { IModuleAccess } from "@/models/employee";

export type UserRole = 'super_admin' | 'admin' | 'employee';

const ADMIN_EMAILS =
  process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim()) || [];

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        userId: { label: "User ID", type: "text" },
        password: { label: "Password", type: "password" },
        companyId: { label: "Company ID", type: "text" },
        company: { label: "Company", type: "text" },
        locationId: { label: "Location ID", type: "text" },
        location: { label: "Location", type: "text" },
        loginType: { label: "Login Type", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.userId || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        try {
          await connectDB();

          if (credentials.loginType === 'employee') {
            const employee = await Employee.findOne({
              userId: credentials.userId.toLowerCase(),
            });

            if (!employee) {
              throw new Error("Employee not found");
            }

            const isValidPassword = await employee.comparePassword(credentials.password);
            if (!isValidPassword) {
              throw new Error("Invalid password");
            }

            if (!credentials.companyId || !credentials.company || !credentials.locationId || !credentials.location) {
              throw new Error("Company and location details required");
            }

            const company = employee.companies.find(
              (c: any) => c.companyId === credentials.companyId.toUpperCase()
            );
            if (!company) {
              throw new Error("Invalid company details");
            }

            const location = company.locations.find(
              (l: any) => l.locationId === credentials.locationId
            );
            if (!location) {
              throw new Error("Invalid location details");
            }

            let user = await User.findOne({ userId: employee.userId });
            if (!user) {
              user = new User({
                userId: employee.userId,
                password: employee.password,
                role: 'employee',
                email: employee.email || `${employee.userId}@company.com`,
                companies: [{
                  companyId: company.companyId,
                  name: company.name,
                  locations: [{ locationId: location.locationId, name: location.name }],
                }],
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
                  locations: [{ locationId: location.locationId, name: location.name }],
                });
                await user.save();
              } else {
                const companyInUser = user.companies.find(
                  (c: any) => c.companyId === company.companyId
                );
                const locationExists = companyInUser.locations.some(
                  (l: any) => l.locationId === location.locationId
                );
                if (!locationExists) {
                  companyInUser.locations.push({ locationId: location.locationId, name: location.name });
                  await user.save();
                }
              }
            }

            return {
              id: user._id.toString(),
              userId: user.userId,
              role: user.role,
              companies: user.companies,
              email: user.email,
              moduleAccess: employee.moduleAccess,
            };
          } else {
            // Handle admin and super_admin login
            const user = await User.findOne({
              userId: credentials.userId.toLowerCase(),
            });

            if (!user) {
              throw new Error("User not found");
            }

            const isValidPassword = await user.comparePassword(credentials.password);
            if (!isValidPassword) {
              throw new Error("Invalid password");
            }

            // Admin logic - they can access everything
            if (user.role === "admin") {
              // Admins have full access to all modules
              const moduleAccess: IModuleAccess[] = [
                {
                  moduleId: 'all-modules',
                  modulePath: '*',
                  moduleName: 'All Modules',
                  permissions: ['read', 'write', 'delete', 'edit', 'audit']
                }
              ];

              // For admin login, we need to handle company/location info
              let userCompanies = user.companies || [];
              
              if (credentials.companyId && credentials.company) {
                // If company details are provided, ensure they exist in the system
                let company = await Company.findOne({ companyId: credentials.companyId.toUpperCase() });
                if (!company) {
                  company = new Company({
                    companyId: credentials.companyId.toUpperCase(),
                    name: credentials.company,
                    locations: credentials.locationId && credentials.location ? 
                      [{ locationId: credentials.locationId, name: credentials.location }] : [],
                    createdBy: user.userId,
                  });
                  await company.save();
                } else if (credentials.locationId && credentials.location) {
                  const locationExists = company.locations.some(
                    (loc: any) => loc.locationId === credentials.locationId && loc.name === credentials.location
                  );
                  if (!locationExists) {
                    company.locations.push({ locationId: credentials.locationId, name: credentials.location });
                    await company.save();
                  }
                }

                // Create location if provided
                if (credentials.locationId && credentials.location) {
                  const location = await Location.findOne({ locationId: credentials.locationId });
                  if (!location) {
                    const newLocation = new Location({
                      locationId: credentials.locationId,
                      name: credentials.location,
                      companyId: credentials.companyId.toUpperCase(),
                      createdBy: user.userId,
                    });
                    await newLocation.save();
                  }
                }

                // Update user's companies if not already present
                const companyExistsInUser = userCompanies.some(
                  (c: any) => c.companyId === credentials.companyId.toUpperCase()
                );
                if (!companyExistsInUser) {
                  userCompanies.push({
                    companyId: credentials.companyId.toUpperCase(),
                    name: credentials.company,
                    locations: credentials.locationId && credentials.location ? 
                      [{ locationId: credentials.locationId, name: credentials.location }] : [],
                  });
                  user.companies = userCompanies;
                  await user.save();
                } else if (credentials.locationId && credentials.location) {
                  const companyInUser = userCompanies.find(
                    (c: any) => c.companyId === credentials.companyId.toUpperCase()
                  );
                  const locationExistsInCompany = companyInUser.locations.some(
                    (loc: any) => loc.locationId === credentials.locationId
                  );
                  if (!locationExistsInCompany) {
                    companyInUser.locations.push({ locationId: credentials.locationId, name: credentials.location });
                    user.companies = userCompanies;
                    await user.save();
                  }
                }
              }

              return {
                id: user._id.toString(),
                userId: user.userId,
                role: user.role,
                companies: userCompanies,
                email: user.email,
                moduleAccess,
              };
            }

            // Super admin logic (existing logic)
            if (user.role === "super_admin") {
              if (!credentials.companyId || !credentials.company || !credentials.locationId || !credentials.location) {
                throw new Error("Company and location details required");
              }

              let company = await Company.findOne({ companyId: credentials.companyId.toUpperCase() });
              if (!company) {
                company = new Company({
                  companyId: credentials.companyId.toUpperCase(),
                  name: credentials.company,
                  locations: [{ locationId: credentials.locationId, name: credentials.location }],
                  createdBy: user.userId,
                });
                await company.save();
              } else {
                const locationExists = company.locations.some(
                  (loc: any) => loc.locationId === credentials.locationId && loc.name === credentials.location
                );
                if (!locationExists) {
                  company.locations.push({ locationId: credentials.locationId, name: credentials.location });
                  await company.save();
                }
              }

              const location = await Location.findOne({ locationId: credentials.locationId });
              if (!location) {
                const newLocation = new Location({
                  locationId: credentials.locationId,
                  name: credentials.location,
                  companyId: credentials.companyId.toUpperCase(),
                  createdBy: user.userId,
                });
                await newLocation.save();
              }

              const companyExistsInUser = user.companies.some(
                (c: any) => c.companyId === credentials.companyId.toUpperCase()
              );
              if (!companyExistsInUser) {
                user.companies.push({
                  companyId: credentials.companyId.toUpperCase(),
                  name: credentials.company,
                  locations: [{ locationId: credentials.locationId, name: credentials.location }],
                });
                await user.save();
              } else {
                const companyInUser = user.companies.find(
                  (c: any) => c.companyId === credentials.companyId.toUpperCase()
                );
                const locationExistsInCompany = companyInUser.locations.some(
                  (loc: any) => loc.locationId === credentials.locationId
                );
                if (!locationExistsInCompany) {
                  companyInUser.locations.push({ locationId: credentials.locationId, name: credentials.location });
                  await user.save();
                }
              }

              const moduleAccess: IModuleAccess[] = [
                {
                  moduleId: 'all-modules',
                  modulePath: '*',
                  moduleName: 'All Modules',
                  permissions: ['read', 'write', 'delete', 'edit', 'audit']
                }
              ];

              return {
                id: user._id.toString(),
                userId: user.userId,
                role: user.role,
                companies: user.companies,
                email: user.email,
                moduleAccess,
              };
            }

            // If user role is employee but not using employee login type
            if (user.role === "employee") {
              const employee = await Employee.findOne({ userId: user.userId });
              if (!employee) {
                throw new Error("Employee record not found");
              }

              if (!credentials.companyId || !credentials.company || !credentials.locationId || !credentials.location) {
                throw new Error("Company and location details required");
              }

              const company = user.companies.find(
                (c: any) => c.companyId === credentials.companyId.toUpperCase() && c.name === credentials.company
              );
              if (!company) {
                throw new Error("Invalid company details");
              }

              const location = company.locations.find(
                (l: any) => l.locationId === credentials.locationId && l.name === credentials.location
              );
              if (!location) {
                throw new Error("Invalid location details");
              }

              return {
                id: user._id.toString(),
                userId: user.userId,
                role: user.role,
                companies: user.companies,
                email: user.email,
                moduleAccess: employee.moduleAccess,
              };
            }

            throw new Error("Invalid user role");
          }
        } catch (error) {
          if (error instanceof Error) {
            throw new Error(error.message);
          }
          throw new Error("Authentication failed");
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!ADMIN_EMAILS.includes(user.email || "")) {
          return false;
        }

        try {
          await connectDB();

          let existingUser = await User.findOne({ email: user.email });

          if (!existingUser) {
            existingUser = new User({
              userId: user.email?.split("@")[0] || "superadmin",
              password: "oauth_user",
              role: "super_admin",
              email: user.email,
              companies: []
            });
            await existingUser.save();
          }

          user.id = existingUser._id.toString();
          user.userId = existingUser.userId;
          user.role = existingUser.role;
          user.companies = existingUser.companies;
          user.moduleAccess = [{
            moduleId: 'all-modules',
            modulePath: '*',
            moduleName: 'All Modules',
            permissions: ['read', 'write', 'delete', 'edit', 'audit']
          }];

          return true;
        } catch (error) {
          console.error("Super admin creation error:", error);
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.userId = user.userId;
        token.role = user.role;
        token.companies = user.companies;
        token.email = user.email;
        token.moduleAccess = user.moduleAccess;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        userId: token.userId,
        role: token.role,
        companies: token.companies,
        email: token.email,
        moduleAccess: token.moduleAccess,
      } as SessionUser;
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

declare module "next-auth" {
  interface User {
    id: string;
    userId: string;
    role: UserRole; // Use UserRole instead of string
    companies: { companyId: string; name: string; locations: { locationId: string; name: string }[] }[];
    email?: string;
    moduleAccess?: IModuleAccess[];
  }

  interface Session {
    user: SessionUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    userId: string;
    role: UserRole; // Use UserRole instead of string
    companies: { companyId: string; name: string; locations: { locationId: string; name: string }[] }[];
    email?: string;
    moduleAccess?: IModuleAccess[];
  }
}