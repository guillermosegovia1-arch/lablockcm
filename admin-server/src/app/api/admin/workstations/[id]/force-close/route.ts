import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workstationId = Number(params.id);

    if (isNaN(workstationId)) {
      return NextResponse.json({ error: 'ID de equipo inválido' }, { status: 400 });
    }

    const now = new Date();

    // 1. Marcar cualquier sesión activa en este equipo como 'forzada_cierre'
    const updatedSessions = await prisma.session.updateMany({
      where: {
        workstation_id: workstationId,
        estado: 'activa',
      },
      data: {
        estado: 'forzada_cierre',
        hora_fin: now,
      },
    });

    // 2. Devolver la estación a disponible
    const updatedWs = await prisma.workstation.update({
      where: { id: workstationId },
      data: {
        estado: 'disponible',
        ultimo_ping: now,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Sesión remota terminada forzosamente en ${updatedWs.machine_name}.`,
      closedCount: updatedSessions.count,
    });
  } catch (error: any) {
    console.error('Error al forzar cierre:', error);
    return NextResponse.json({ error: 'Error del servidor al forzar cierre.' }, { status: 500 });
  }
}
