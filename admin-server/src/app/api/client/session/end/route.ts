import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { session_id, machine_name } = await req.json();

    if (!session_id && !machine_name) {
      return NextResponse.json(
        { error: 'Se requiere session_id o machine_name para cerrar la sesión.' },
        { status: 400 }
      );
    }

    const now = new Date();
    let closedSession = null;

    if (session_id) {
      closedSession = await prisma.session.update({
        where: { id: Number(session_id) },
        data: {
          estado: 'cerrada',
          hora_fin: now,
        },
      });

      // Liberar la estación correspondiente
      if (closedSession) {
        await prisma.workstation.update({
          where: { id: closedSession.workstation_id },
          data: {
            estado: 'disponible',
            ultimo_ping: now,
          },
        });
      }
    } else if (machine_name) {
      const cleanMachineName = machine_name.trim().toUpperCase();
      const workstation = await prisma.workstation.findUnique({
        where: { machine_name: cleanMachineName },
      });

      if (workstation) {
        await prisma.session.updateMany({
          where: {
            workstation_id: workstation.id,
            estado: 'activa',
          },
          data: {
            estado: 'cerrada',
            hora_fin: now,
          },
        });

        await prisma.workstation.update({
          where: { id: workstation.id },
          data: {
            estado: 'disponible',
            ultimo_ping: now,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sesión cerrada correctamente. Equipo libre.',
      timestamp: now,
    });
  } catch (error: any) {
    console.error('Error en /api/client/session/end:', error);
    return NextResponse.json(
      { error: 'Error del servidor al finalizar la sesión.' },
      { status: 500 }
    );
  }
}
