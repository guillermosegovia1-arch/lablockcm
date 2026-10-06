import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Sesión finalizada' });
  response.cookies.delete('lablock_admin_token');
  return response;
}
