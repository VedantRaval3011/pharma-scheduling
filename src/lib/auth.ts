import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { User } from "@/models/user";
import { Company } from "@/models/company";
import { Location } from "@/models/location";
import connectDB from "./db";
import { SessionUser } from "@/types/user";

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

          const user = await User.findOne({
            userId: credentials.userId.toLowerCase(),
          });

          if (!user) {
            throw new Error("User not found");
          }

          const isValidPassword = await user.comparePassword(
            credentials.password
          );
          if (!isValidPassword) {
            throw new Error("Invalid password");
          }

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
          } else {
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
          }

          return {
            id: user._id.toString(),
            userId: user.userId,
            role: user.role,
            companies: user.companies,
            email: user.email,
          };
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
    role: string;
    companies: { companyId: string; name: string; locations: { locationId: string; name: string }[] }[];
    email?: string;
  }

  interface Session {
    user: SessionUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    userId: string;
    role: string;
    companies: { companyId: string; name: string; locations: { locationId: string; name: string }[] }[];
    email?: string;
  }
}