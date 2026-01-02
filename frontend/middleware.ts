import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Add CORS headers if needed
  const response = NextResponse.next();
  
  return response;
}

export const config = {
  matcher: '/api/:path*',
};

