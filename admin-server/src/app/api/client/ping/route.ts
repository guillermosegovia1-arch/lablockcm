import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { machine_name, ip_address, session_id } = await req.json();

    if (!machine_name) {
      return NextResponse.json({ error: 'machine_name requerido' }, { status: 400 });
    }

    const cleanMachineName = machine_name.trim().toUpperCase();
    const now = new Date();

    // Actualizar o registrar la máquina
    const workstation = await prisma.workstation.upsert({
      where: { machine_name: cleanMachineName },
      update: {
        ultimo_ping: now,
        ip_address: ip_address || undefined,
      },
      create: {
        machine_name: cleanMachineName,
        ip_address: ip_address || '127.0.0.1',
        estado: 'disponible',
        ultimo_ping: now,
      },
    });

    let should_lock = false;
    let lock_reason = '';

    // Si la estación está marcada como bloqueada por el admin
    if (workstation.estado === 'bloqueado') {
      should_lock = true;
      lock_reason = 'El equipo ha sido bloqueado remotamente por el Administrador.';
    }

    // Si el cliente envió un session_id activo, verificar si el admin forzó su cierre
    if (session_id) {
      const currentSession = await prisma.session.findUnique({
        where: { id: Number(session_id) },
      });

      if (!currentSession || currentSession.estado === 'forzada_cierre' || currentSession.estado === 'cerrada') {
        should_lock = true;
        lock_reason = currentSession?.estado === 'forzada_cierre'
          ? 'Tu sesión fue finalizada remotamente por el Encargado del Laboratorio.'
          : 'Sesión no activa.';
      }
    }

    return NextResponse.json({
      status: 'ok',
      workstation_id: workstation.id,
      workstation_state: workstation.estado,
      should_lock,
      lock_reason,
      server_time: now,
    });
  } catch (error: any) {
    console.error('Error en /api/client/ping:', error);
    return NextResponse.json({ error: 'Error interno en ping' }, { status: 500 });
  }
}
