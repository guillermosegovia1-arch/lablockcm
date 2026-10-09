import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const workstations = await prisma.workstation.findMany({
      orderBy: { machine_name: 'asc' },
      include: {
        sessions: {
          where: { estado: 'activa' },
          include: {
            user: {
              select: {
                id: true,
                nombre: true,
                rol: true,
                grupo_id: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    const now = new Date().getTime();

    const formatted = workstations.map((ws) => {
      const activeSession = ws.sessions[0] || null;
      let elapsedMinutes = 0;
      if (activeSession) {
        const startTime = new Date(activeSession.hora_inicio).getTime();
        elapsedMinutes = Math.max(0, Math.floor((now - startTime) / (1000 * 60)));
      }

      const lastPingTime = new Date(ws.ultimo_ping).getTime();
      const isOnline = (now - lastPingTime) < 90 * 1000;

      return {
        id: ws.id,
        machine_name: ws.machine_name,
        ip_address: ws.ip_address,
        estado: ws.estado,
        ultimo_ping: ws.ultimo_ping,
        is_online: isOnline,
        active_session: activeSession
          ? {
              id: activeSession.id,
              hora_inicio: activeSession.hora_inicio,
              elapsed_minutes: elapsedMinutes,
              user: activeSession.user,
              programas_usados: activeSession.programas_usados || [],
              historial_web: activeSession.historial_web || [],
            }
          : null,
      };
    });

    return NextResponse.json({
      workstations: formatted,
      total: formatted.length,
      en_uso: formatted.filter((w) => w.estado === 'en_uso').length,
      disponibles: formatted.filter((w) => w.estado === 'disponible').length,
      bloqueados: formatted.filter((w) => w.estado === 'bloqueado').length,
    });
  } catch (error: any) {
    console.error('Error al obtener workstations:', error);
    return NextResponse.json({ error: 'Error del servidor al cargar equipos.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { machine_name, ip_address } = await req.json();
    if (!machine_name) {
      return NextResponse.json({ error: 'Nombre de equipo requerido.' }, { status: 400 });
    }

    const cleanName = machine_name.trim().toUpperCase();
    const created = await prisma.workstation.upsert({
      where: { machine_name: cleanName },
      update: {
        ip_address: ip_address || undefined,
      },
      create: {
        machine_name: cleanName,
        ip_address: ip_address || '127.0.0.1',
        estado: 'disponible',
      },
    });

    return NextResponse.json({ success: true, workstation: created });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID de equipo requerido.' }, { status: 400 });
    }

    const wsId = Number(id);

    // Eliminar sesiones asociadas primero
    await prisma.session.deleteMany({
      where: { workstation_id: wsId },
    });

    // Eliminar el equipo registrado
    await prisma.workstation.delete({
      where: { id: wsId },
    });

    return NextResponse.json({ success: true, message: 'Equipo eliminado del sistema.' });
  } catch (error: any) {
    console.error('Error al eliminar equipo:', error);
    return NextResponse.json({ error: error.message || 'Error al eliminar el equipo.' }, { status: 500 });
  }
}
