import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { nombre_completo, usuario, machine_name, ip_address } = await req.json();
    const queryName = (nombre_completo || usuario || '').trim();

    if (!queryName || !machine_name) {
      return NextResponse.json(
        { error: 'Parámetros incompletos (Nombre completo y nombre de equipo requeridos).' },
        { status: 400 }
      );
    }

    const cleanMachineName = machine_name.trim().toUpperCase();
    const clientIp = ip_address || '127.0.0.1';
    const normalizedName = queryName.replace(/\s+/g, ' ').trim();

    // 1. Buscar usuario por nombre (insensible a mayúsculas y minúsculas)
    const user = await prisma.user.findFirst({
      where: {
        nombre: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
    });

    if (!user || !user.activo) {
      return NextResponse.json(
        {
          error: 'Usuario no encontrado en el sistema escolar.',
          code: 'USER_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // 2. Verificar si el usuario YA tiene una sesión activa en cualquier equipo
    const existingActiveSession = await prisma.session.findFirst({
      where: {
        user_id: user.id,
        estado: 'activa',
      },
      include: {
        workstation: true,
      },
    });

    if (existingActiveSession) {
      const activePc = existingActiveSession.workstation.machine_name;

      // Si la sesión activa está en OTRA computadora diferente:
      if (activePc !== cleanMachineName) {
        return NextResponse.json(
          {
            error: `Esta sesión ya está iniciada en el Equipo: [${activePc}]. Comunícate con el encargado si esto es un error.`,
            code: 'DUPLICATE_SESSION',
            active_machine: activePc,
            session_id: existingActiveSession.id,
            start_time: existingActiveSession.hora_inicio,
          },
          { status: 409 }
        );
      } else {
        // Mismo equipo (reconexión)
        await prisma.workstation.update({
          where: { id: existingActiveSession.workstation_id },
          data: {
            estado: 'en_uso',
            ip_address: clientIp,
            ultimo_ping: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Sesión restaurada en este equipo.',
          session: {
            id: existingActiveSession.id,
            hora_inicio: existingActiveSession.hora_inicio,
          },
          user: {
            id: user.id,
            nombre: user.nombre,
            nombre_completo: user.nombre,
            rol: user.rol,
            grupo_id: user.grupo_id,
          },
          workstation: {
            id: existingActiveSession.workstation_id,
            machine_name: cleanMachineName,
          },
        });
      }
    }

    // 3. Registrar o actualizar la estación de trabajo
    let workstation = await prisma.workstation.findUnique({
      where: { machine_name: cleanMachineName },
    });

    if (!workstation) {
      workstation = await prisma.workstation.create({
        data: {
          machine_name: cleanMachineName,
          ip_address: clientIp,
          estado: 'en_uso',
          ultimo_ping: new Date(),
        },
      });
    } else {
      if (workstation.estado === 'bloqueado') {
        return NextResponse.json(
          {
            error: `Este equipo [${cleanMachineName}] se encuentra bloqueado por la administración.`,
            code: 'WORKSTATION_LOCKED',
          },
          { status: 403 }
        );
      }

      await prisma.session.updateMany({
        where: {
          workstation_id: workstation.id,
          estado: 'activa',
        },
        data: {
          estado: 'cerrada',
          hora_fin: new Date(),
        },
      });

      workstation = await prisma.workstation.update({
        where: { id: workstation.id },
        data: {
          estado: 'en_uso',
          ip_address: clientIp,
          ultimo_ping: new Date(),
        },
      });
    }

    // 4. Crear la nueva sesión
    const now = new Date();
    const newSession = await prisma.session.create({
      data: {
        user_id: user.id,
        workstation_id: workstation.id,
        fecha: now,
        hora_inicio: now,
        estado: 'activa',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      session: {
        id: newSession.id,
        hora_inicio: newSession.hora_inicio,
      },
      user: {
        id: user.id,
        nombre: user.nombre,
        nombre_completo: user.nombre,
        rol: user.rol,
        grupo_id: user.grupo_id,
      },
      workstation: {
        id: workstation.id,
        machine_name: workstation.machine_name,
      },
    });
  } catch (error: any) {
    console.error('Error en /api/client/session/start:', error);
    return NextResponse.json(
      { error: 'Error del servidor al procesar la sesión.' },
      { status: 500 }
    );
  }
}
