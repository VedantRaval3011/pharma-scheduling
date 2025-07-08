import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const { token } = req.nextauth;

    // Role-based access control
    if (pathname.startsWith('/dashboard/super-admin') && token?.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    if (pathname.startsWith('/dashboard/admin') && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    if (pathname.startsWith('/dashboard/employee') && token?.role !== 'employee') {
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