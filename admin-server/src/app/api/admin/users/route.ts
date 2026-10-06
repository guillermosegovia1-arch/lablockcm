import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const rol = searchParams.get('rol') || '';
    const grupo = searchParams.get('grupo') || '';

    const where: any = {};
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { grupo_id: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (rol && rol !== 'todos') {
      where.rol = rol;
    }
    if (grupo && grupo !== 'todos') {
      where.grupo_id = grupo;
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { nombre: 'asc' },
      take: 200,
      select: {
        id: true,
        nombre: true,
        rol: true,
        grupo_id: true,
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
    const body = await req.json();
    const rawNombre = body.nombre || body.nombre_completo;
    const rol = body.rol || 'alumno';
    const grupo_id = body.grupo_id ? String(body.grupo_id).trim() : null;
    const pin = body.pin;

    if (!rawNombre) {
      return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
    }

    const cleanNombre = String(rawNombre).trim();
    const existing = await prisma.user.findUnique({
      where: { nombre: cleanNombre },
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
        nombre: cleanNombre,
        rol: rol || 'alumno',
        grupo_id: grupo_id,
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
    const body = await req.json();
    const { id, activo, rol, grupo_id } = body;
    const rawNombre = body.nombre || body.nombre_completo;

    const updated = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        ...(activo !== undefined ? { activo } : {}),
        ...(rol ? { rol } : {}),
        ...(grupo_id !== undefined ? { grupo_id: grupo_id ? String(grupo_id).trim() : null } : {}),
        ...(rawNombre ? { nombre: String(rawNombre).trim() } : {}),
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
