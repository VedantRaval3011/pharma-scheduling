import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { UserRole } from './types/auth';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const { token } = req.nextauth;
    const userRole = token?.role as UserRole;

    // Role-based access control
    // Super admin can access everything
    if (userRole === 'super_admin') {
      return NextResponse.next();
    }

    // Admin can access everything (including super-admin routes)
    if (userRole === 'admin') {
      return NextResponse.next();
    }

    // Restrict super-admin routes for non-super-admin/admin users
    if (pathname.startsWith('/dashboard/super-admin') && 
        token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    // Restrict admin routes for non-admin users (employees)
    if (pathname.startsWith('/dashboard/admin') && 
        token?.role !== 'admin' && 
        token?.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    // Only employees are restricted to employee routes
    if (pathname.startsWith('/dashboard/employee') && 
        token?.role !== 'employee' && 
        token?.role !== 'admin' && 
        token?.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Allow access to auth pages without token
        if (pathname.startsWith('/auth/')) {
          return true;
        }
        
        // Require token for protected routes
        if (pathname.startsWith('/dashboard/')) {
          return !!token;
        }
        
        return true;
      },
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*']
};
