import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { key } = await req.json();

    if (!key) {
      return NextResponse.json({ authorized: false, error: 'Clave requerida' }, { status: 400 });
    }

    const masterKey = process.env.MASTER_EMERGENCY_KEY || 'CMADMIN2026';

    // 1. Comparar con clave maestra institucional principal (CMADMIN2026 fija de contingencia)
    if (key.trim() === masterKey) {
      return NextResponse.json({ authorized: true, role: 'master_admin', message: 'Desbloqueo Maestro Autorizado' });
    }

    // 1.5. Comparar con contraseña de Soporte Técnico editada/personalizada por el administrador
    const customSupportSetting = await prisma.systemSetting.findUnique({
      where: { clave: 'support_password' },
    });
    if (customSupportSetting && customSupportSetting.valor && customSupportSetting.valor.trim() !== '') {
      if (key.trim() === customSupportSetting.valor.trim()) {
        return NextResponse.json({
          authorized: true,
          role: 'custom_support',
          message: 'Desbloqueo de Soporte Técnico Autorizado',
        });
      }
    }

    // 2. Comparar con usuarios con rol admin
    const adminUsers = await prisma.user.findMany({
      where: { rol: 'admin', activo: true },
    });

    for (const admin of adminUsers) {
      if (admin.pin_o_password) {
        const matches = await bcrypt.compare(key.trim(), admin.pin_o_password);
        if (matches) {
          return NextResponse.json({
            authorized: true,
            role: 'admin',
            admin_name: admin.nombre,
            message: `Desbloqueo autorizado por ${admin.nombre}`,
          });
        }
      }
    }

    return NextResponse.json(
      { authorized: false, error: 'Clave maestra o credencial de soporte inválida.' },
      { status: 403 }
    );
  } catch (error: any) {
    console.error('Error en emergency-verify:', error);
    return NextResponse.json({ authorized: false, error: 'Error del servidor' }, { status: 500 });
  }
}
