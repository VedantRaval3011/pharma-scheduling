"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserRole } from "@/types/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      console.log("ProtectedRoute: No session, redirecting to login");
      router.push("/auth/login");
      return;
    }

    // Role hierarchy: super_admin > admin > employee
    const userRole = session.user.role;

    if (allowedRoles && allowedRoles.length > 0) {
      let hasAccess = false;

      // Check if user role is in allowed roles OR has higher permissions
      if (allowedRoles.includes(userRole)) {
        hasAccess = true;
      } else if (userRole === "super_admin") {
        // Super admin can access everything
        hasAccess = true;
      } else if (userRole === "employee" && !allowedRoles.includes("admin")) {
        // Super admin can access everything
        hasAccess = true;
      } else if (
        userRole === "admin" &&
        !allowedRoles.includes("super_admin")
      ) {
        // Admin can access admin and employee routes, but not super_admin only routes
        hasAccess = true;
      }

      if (!hasAccess) {
        console.log(
          `ProtectedRoute: Role ${userRole} not allowed for roles ${allowedRoles.join(
            ", "
          )}, redirecting to unauthorized`
        );
        router.push("/unauthorized");
        return;
      }
    }
  }, [session, status, router, allowedRoles]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}
