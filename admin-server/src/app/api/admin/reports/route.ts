import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const rol = searchParams.get('rol') || '';
    const workstation = searchParams.get('workstation') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const format = searchParams.get('format');

    const whereClause: any = {};

    if (search) {
      whereClause.user = {
        nombre_completo: { contains: search },
      };
    }

    if (rol && rol !== 'todos') {
      whereClause.user = {
        ...whereClause.user,
        rol: rol,
      };
    }

    if (workstation && workstation !== 'todos') {
      whereClause.workstation = {
        machine_name: workstation,
      };
    }

    if (dateFrom || dateTo) {
      whereClause.fecha = {};
      if (dateFrom) {
        whereClause.fecha.gte = new Date(`${dateFrom}T00:00:00.000Z`);
      }
      if (dateTo) {
        whereClause.fecha.lte = new Date(`${dateTo}T23:59:59.999Z`);
      }
    }

    const sessions = await prisma.session.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            nombre_completo: true,
            rol: true,
          },
        },
        workstation: {
          select: {
            id: true,
            machine_name: true,
            ip_address: true,
          },
        },
      },
      orderBy: { hora_inicio: 'desc' },
      take: 200,
    });

    const formatted = sessions.map((s) => {
      const inicio = new Date(s.hora_inicio);
      const fin = s.hora_fin ? new Date(s.hora_fin) : null;

      let duracionMinutos = 0;
      let duracionTexto = 'En curso';

      if (fin) {
        duracionMinutos = Math.max(0, Math.floor((fin.getTime() - inicio.getTime()) / (1000 * 60)));
        const horas = Math.floor(duracionMinutos / 60);
        const mins = duracionMinutos % 60;
        duracionTexto = horas > 0 ? `${horas}h ${mins}m` : `${mins} min`;
      } else {
        const transcurrido = Math.max(0, Math.floor((Date.now() - inicio.getTime()) / (1000 * 60)));
        duracionTexto = `En curso (${transcurrido}m)`;
      }

      return {
        id: s.id,
        nombre: s.user.nombre_completo,
        rol: s.user.rol,
        equipo: s.workstation.machine_name,
        fecha: inicio.toLocaleDateString('es-MX'),
        fecha_raw: inicio.toISOString().split('T')[0],
        hora_entrada: inicio.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        hora_salida: fin ? fin.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '---',
        duracion: duracionTexto,
        duracion_minutos: duracionMinutos,
        estado: s.estado,
      };
    });

    if (format === 'csv') {
      const header = 'ID,Nombre Completo,Rol,Equipo,Fecha,Hora Entrada,Hora Salida,Duración,Estado\n';
      const rows = formatted
        .map(
          (r) =>
            `"${r.id}","${r.nombre.replace(/"/g, '""')}","${r.rol}","${r.equipo}","${r.fecha}","${r.hora_entrada}","${r.hora_salida}","${r.duracion}","${r.estado}"`
        )
        .join('\n');

      return new NextResponse(header + rows, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="Reporte_LabLock_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({
      total: formatted.length,
      sessions: formatted,
    });
  } catch (error: any) {
    console.error('Error en /api/admin/reports:', error);
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 });
  }
}
