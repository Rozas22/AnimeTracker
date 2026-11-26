import { NextResponse } from 'next/server';

/** Dirección antigua del reto. */
export function GET(request: Request): NextResponse {
  return NextResponse.redirect(new URL('/reto', request.url), 308);
}
