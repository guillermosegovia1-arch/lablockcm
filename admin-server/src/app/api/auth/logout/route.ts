import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const accept = req.headers.get('accept') || '';
  const isHtml = accept.includes('text/html');

  const response = isHtml
    ? NextResponse.redirect(new URL('/login', req.url), 303)
    : NextResponse.json({ success: true, message: 'Sesión finalizada' });

  response.cookies.delete('lablock_admin_token');
  return response;
}

