import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { machine_name, ip_address, session_id, programas_usados, historial_web } = await req.json();

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
      } else {
        const sessionUpdates: any = {};

        if (Array.isArray(programas_usados) && programas_usados.length > 0) {
          const prevPrograms: string[] = Array.isArray(currentSession.programas_usados)
            ? (currentSession.programas_usados as any[]).map((p) => (typeof p === 'string' ? p : p.name || p.nombre || ''))
            : [];
          const combined = Array.from(new Set([...prevPrograms, ...programas_usados.map((p) => String(p).trim()).filter(Boolean)]));
          sessionUpdates.programas_usados = combined;
        }

        if (Array.isArray(historial_web) && historial_web.length > 0) {
          const prevWeb: any[] = Array.isArray(currentSession.historial_web)
            ? (currentSession.historial_web as any[])
            : [];
          const existingTitles = new Set(prevWeb.map((w) => w.title || w.titulo || ''));
          const newEntries = historial_web.filter((w: any) => {
            const title = w.title || w.titulo || '';
            return title && !existingTitles.has(title);
          });
          if (newEntries.length > 0) {
            sessionUpdates.historial_web = [...prevWeb, ...newEntries].slice(-100);
          }
        }

        if (Object.keys(sessionUpdates).length > 0) {
          await prisma.session.update({
            where: { id: currentSession.id },
            data: sessionUpdates,
          });
        }
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
