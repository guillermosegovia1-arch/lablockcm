import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supportSetting = await prisma.systemSetting.findUnique({
      where: { clave: 'support_password' },
    });

    return NextResponse.json({
      master_emergency_key: process.env.MASTER_EMERGENCY_KEY || 'CMADMIN2026',
      custom_support_password: supportSetting?.valor || '',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { custom_support_password } = await req.json();

    const cleanPassword = typeof custom_support_password === 'string' ? custom_support_password.trim() : '';

    const setting = await prisma.systemSetting.upsert({
      where: { clave: 'support_password' },
      update: { valor: cleanPassword },
      create: { clave: 'support_password', valor: cleanPassword },
    });

    return NextResponse.json({
      success: true,
      custom_support_password: setting.valor,
      message: 'Contraseña de Soporte Técnico actualizada correctamente.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
