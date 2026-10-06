import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const rol = searchParams.get('rol') || '';

    const where: any = {};
    if (search) {
      where.nombre_completo = { contains: search };
    }
    if (rol && rol !== 'todos') {
      where.rol = rol;
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { nombre_completo: 'asc' },
      take: 150,
      select: {
        id: true,
        nombre_completo: true,
        rol: true,
        activo: true,
        createdAt: true,
        _count: {
          select: { sessions: true },
        },
      },
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { nombre_completo, rol, pin } = await req.json();

    if (!nombre_completo) {
      return NextResponse.json({ error: 'Nombre completo requerido' }, { status: 400 });
    }

    const cleanNombre = nombre_completo.trim();
    const existing = await prisma.user.findUnique({
      where: { nombre_completo: cleanNombre },
    });

    if (existing) {
      return NextResponse.json({ error: 'Este usuario ya está registrado en el sistema.' }, { status: 409 });
    }

    let hashedPin = null;
    if (pin) {
      hashedPin = await bcrypt.hash(pin.trim(), 10);
    }

    const user = await prisma.user.create({
      data: {
        nombre_completo: cleanNombre,
        rol: rol || 'alumno',
        activo: true,
        pin_o_password: hashedPin,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, activo, rol, nombre_completo } = await req.json();

    const updated = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        ...(activo !== undefined ? { activo } : {}),
        ...(rol ? { rol } : {}),
        ...(nombre_completo ? { nombre_completo: nombre_completo.trim() } : {}),
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
