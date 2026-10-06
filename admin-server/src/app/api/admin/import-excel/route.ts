import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let rowsToProcess: any[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json({ error: 'No se subió ningún archivo.' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rowsToProcess = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    } else {
      const body = await req.json();
      rowsToProcess = body.rows || [];
    }

    if (!rowsToProcess || rowsToProcess.length === 0) {
      return NextResponse.json({ error: 'El archivo no contiene filas o está vacío.' }, { status: 400 });
    }

    let inserted = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    const defaultTeacherHash = await bcrypt.hash('1234', 10);

    for (let index = 0; index < rowsToProcess.length; index++) {
      const row = rowsToProcess[index];

      const rawNombre =
        row['Nombre'] ||
        row['nombre'] ||
        row['Nombre Completo'] ||
        row['nombre_completo'] ||
        row['Alumno'] ||
        row['Estudiante'] ||
        row['Profesor'] ||
        row['Docente'];

      const rawRol =
        row['Rol'] ||
        row['rol'] ||
        row['Tipo'] ||
        row['tipo'] ||
        'alumno';

      const rawGrupo =
        row['grupo_id'] ||
        row['Grupo_ID'] ||
        row['Grupo'] ||
        row['grupo'] ||
        row['Salon'] ||
        row['salon'] ||
        row['Grado'] ||
        row['grado'] ||
        null;

      const rawPin = row['PIN'] || row['pin'] || row['Password'] || row['password'];

      if (!rawNombre) {
        errors++;
        errorDetails.push(`Fila ${index + 2}: Nombre faltante.`);
        continue;
      }

      const nombre = String(rawNombre).trim();
      const grupo_id = rawGrupo ? String(rawGrupo).trim() : null;

      let rol = String(rawRol).trim().toLowerCase();
      if (rol.includes('maestr') || rol.includes('docent') || rol.includes('prof')) {
        rol = 'maestro';
      } else if (rol.includes('admin') || rol.includes('sistem')) {
        rol = 'admin';
      } else {
        rol = 'alumno';
      }

      let passwordHash = undefined;
      if (rawPin) {
        passwordHash = await bcrypt.hash(String(rawPin).trim(), 10);
      } else if (rol === 'maestro') {
        passwordHash = defaultTeacherHash;
      }

      try {
        const existing = await prisma.user.findUnique({
          where: { nombre },
        });

        if (existing) {
          await prisma.user.update({
            where: { nombre },
            data: {
              rol,
              grupo_id,
              activo: true,
              ...(passwordHash ? { pin_o_password: passwordHash } : {}),
            },
          });
          updated++;
        } else {
          await prisma.user.create({
            data: {
              nombre,
              rol,
              grupo_id,
              activo: true,
              pin_o_password: passwordHash || null,
            },
          });
          inserted++;
        }
      } catch (rowErr: any) {
        errors++;
        errorDetails.push(`Fila ${index + 2} (${nombre}): ${rowErr.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      total: rowsToProcess.length,
      inserted,
      updated,
      errors,
      errorDetails: errorDetails.slice(0, 10),
      message: `Proceso completado: ${inserted} nuevos registros insertados, ${updated} actualizados, ${errors} con error.`,
    });
  } catch (error: any) {
    console.error('Error en /api/admin/import-excel:', error);
    return NextResponse.json(
      { error: 'Error al procesar archivo Excel: ' + error.message },
      { status: 500 }
    );
  }
}
