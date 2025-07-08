import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { User } from "@/models/user";
import connectDB from "./db";

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

          // Validate company details for admin and employee
          if (user.role !== "super_admin") {
            if (!credentials.companyId || !credentials.company) {
              throw new Error("Company details required");
            }

            if (
              user.companyId !== credentials.companyId.toUpperCase() ||
              user.company !== credentials.company
            ) {
              throw new Error("Invalid company details");
            }
          }

          return {
            id: user._id.toString(),
            userId: user.userId,
            role: user.role,
            companyId: user.companyId,
            company: user.company,
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
        // Only allow specific emails for super admin
        if (!ADMIN_EMAILS.includes(user.email || "")) {
          return false;
        }

        // Create or update super admin user
        try {
          await connectDB();

          let existingUser = await User.findOne({ email: user.email });

          if (!existingUser) {
            // Create new super admin
            existingUser = new User({
              userId: user.email?.split("@")[0] || "superadmin",
              password: "oauth_user", // Placeholder password
              role: "super_admin",
              email: user.email,
            });
            await existingUser.save();
          }

          // Update user object for JWT
          user.id = existingUser._id.toString();
          user.userId = existingUser.userId;
          user.role = existingUser.role;

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
        token.companyId = user.companyId;
        token.company = user.company;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        userId: token.userId,
        role: token.role,
        companyId: token.companyId,
        company: token.company,
        email: token.email,
      };
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
