import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    const adminExists = await prisma.user.findUnique({
      where: { nombre: 'adminCM' },
      select: { id: true, nombre: true, rol: true },
    });

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      userCount,
      adminConfigured: !!adminExists,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'failed',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
