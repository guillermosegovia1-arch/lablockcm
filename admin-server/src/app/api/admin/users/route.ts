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
        assigned_pc: true,
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
    const assigned_pc = body.assigned_pc ? String(body.assigned_pc).trim().toUpperCase() : null;
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
        assigned_pc: assigned_pc === 'ALL' || !assigned_pc ? null : assigned_pc,
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
    const { id, activo, rol, grupo_id, pin, assigned_pc } = body;
    const rawNombre = body.nombre || body.nombre_completo;

    let hashedPin = undefined;
    if (pin && pin.trim()) {
      hashedPin = await bcrypt.hash(pin.trim(), 10);
    }

    const cleanAssignedPc = assigned_pc !== undefined
      ? (assigned_pc && String(assigned_pc).trim().toUpperCase() !== 'ALL' && String(assigned_pc).trim() !== '' ? String(assigned_pc).trim().toUpperCase() : null)
      : undefined;

    const updated = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        ...(activo !== undefined ? { activo } : {}),
        ...(rol ? { rol } : {}),
        ...(grupo_id !== undefined ? { grupo_id: grupo_id ? String(grupo_id).trim() : null } : {}),
        ...(cleanAssignedPc !== undefined ? { assigned_pc: cleanAssignedPc } : {}),
        ...(rawNombre ? { nombre: String(rawNombre).trim() } : {}),
        ...(hashedPin !== undefined ? { pin_o_password: hashedPin } : {}),
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido.' }, { status: 400 });
    }

    const userId = Number(id);

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    if (targetUser.nombre === 'adminCM') {
      return NextResponse.json(
        { error: 'No es posible eliminar la cuenta principal de soporte técnico (adminCM).' },
        { status: 403 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true, message: 'Usuario eliminado correctamente.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

