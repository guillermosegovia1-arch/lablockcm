const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Inicializando Administrador Principal LabLock CM ---');

  // Limpiar datos previos
  await prisma.session.deleteMany();
  await prisma.workstation.deleteMany();
  await prisma.user.deleteMany();

  // Contraseña encriptada para adminCM: admin123456
  const hashedAdminPassword = await bcrypt.hash('admin123456', 10);

  const admin = await prisma.user.create({
    data: {
      nombre_completo: 'adminCM',
      rol: 'admin',
      activo: true,
      pin_o_password: hashedAdminPassword,
    },
  });

  console.log('✅ Base de datos configurada correctamente con Administrador Único:');
  console.log(`- Usuario: ${admin.nombre_completo}`);
  console.log(`- Contraseña: admin123456`);
  console.log(`- Rol: ${admin.rol}`);
}

main()
  .catch((e) => {
    console.error('Error al inicializar admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
