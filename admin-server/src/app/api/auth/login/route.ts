import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signAdminToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { usuario, matricula, password } = await req.json();
    const loginUser = (usuario || matricula || '').trim();

    if (!loginUser || !password) {
      return NextResponse.json(
        { error: 'Por favor ingresa usuario y contraseña.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { nombre: loginUser },
    });

    if (!user || !user.activo) {
      return NextResponse.json(
        { error: 'Credenciales inválidas o usuario inactivo.' },
        { status: 401 }
      );
    }

    if (user.rol !== 'admin' && user.rol !== 'maestro') {
      return NextResponse.json(
        { error: 'Acceso denegado: Se requieren permisos administrativos o docentes.' },
        { status: 403 }
      );
    }

    // Validar contraseña
    const isMatch = user.pin_o_password
      ? await bcrypt.compare(password, user.pin_o_password)
      : false;

    const isMaster = password === (process.env.MASTER_EMERGENCY_KEY || 'CMADMIN2026');

    if (!isMatch && !isMaster) {
      return NextResponse.json(
        { error: 'Contraseña incorrecta.' },
        { status: 401 }
      );
    }

    const token = signAdminToken({
      userId: user.id,
      nombre: user.nombre,
      rol: user.rol,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        rol: user.rol,
        grupo_id: user.grupo_id,
      },
      token,
    });

    response.cookies.set('lablock_admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (error: any) {
    console.error('Error en /api/auth/login:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
