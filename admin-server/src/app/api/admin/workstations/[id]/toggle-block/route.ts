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

    const ws = await prisma.workstation.findUnique({
      where: { id: workstationId },
    });

    if (!ws) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
    }

    const newStatus = ws.estado === 'bloqueado' ? 'disponible' : 'bloqueado';

    // Si se bloquea y había sesión activa, forzar cierre
    if (newStatus === 'bloqueado') {
      await prisma.session.updateMany({
        where: {
          workstation_id: workstationId,
          estado: 'activa',
        },
        data: {
          estado: 'forzada_cierre',
          hora_fin: new Date(),
        },
      });
    }

    const updated = await prisma.workstation.update({
      where: { id: workstationId },
      data: { estado: newStatus },
    });

    return NextResponse.json({
      success: true,
      message: `Equipo ${updated.machine_name} ahora está ${newStatus}.`,
      workstation: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
