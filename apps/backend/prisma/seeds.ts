// prisma/seeds.ts
import { PrismaClient, Prisma } from '@prisma/client';
const prisma = new PrismaClient();

async function seedUsuario(
  user: {
    firebase_uid: string;
    nombre_completo: string;
    usuario: string;
    correo: string;
    contrasena: string;
    cedula: string;
    rol?: string;
    estado_de_cuenta?: string;
  },
  saldoInicialCOP = 0,
) {
  const u = await prisma.usuario.upsert({
    where: { correo: user.correo },
    update: {}, 
    create: {
      firebase_uid: user.firebase_uid, 
      nombre_completo: user.nombre_completo,
      usuario: user.usuario,
      correo: user.correo,
      contrasena: user.contrasena,
      cedula: user.cedula,
      rol: user.rol ?? 'user',
      estado_de_cuenta: user.estado_de_cuenta ?? 'online',
    },
    select: { id: true },
  });

  await prisma.wallet.upsert({
    where: { usuarioId: u.id },
    update: { balance: new Prisma.Decimal(String(saldoInicialCOP)) },
    create: { usuarioId: u.id, balance: new Prisma.Decimal(String(saldoInicialCOP)) },
  });

  console.log(`✅ Usuario seed: ${user.usuario} (saldo: ${saldoInicialCOP})`);
}

async function main() {
  await seedUsuario(
    {
      firebase_uid: 'seed-uid-juanp',
      nombre_completo: 'Juan Pérez',
      usuario: 'juanp',
      correo: 'juan@example.com',
      contrasena: 'hash_123',
      cedula: '123456789',
    },
    50000,
  );

  await seedUsuario(
    {
      firebase_uid: 'seed-uid-admin',
      nombre_completo: 'Admin',
      usuario: 'admin',
      correo: 'admin@example.com',
      contrasena: 'hash_admin',
      cedula: '999999999',
      rol: 'admin',
    },
    200000,
  );
}

main()
  .then(() => console.log('🌱 Seed finalizado correctamente'))
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
