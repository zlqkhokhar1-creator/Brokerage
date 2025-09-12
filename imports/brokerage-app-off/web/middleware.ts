import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Add security headers
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')
  
  // Authentication check temporarily disabled for development
  // const session = request.cookies.get('session')
  // if (!session && !request.nextUrl.pathname.startsWith('/auth')) {
  //   return NextResponse.redirect(new URL('/auth/login', request.url))
  // }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
