import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Admin user yarat
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {},
    create: {
      password: await bcrypt.hash('12345678', 10),
      firstName: 'Admin',
      lastName: 'Admin',
      email: 'admin@gmail.com',
      phone: '+994501234567',
      role: 'ADMIN',
      balance: 0,
      teacherBalance: 0,
    },
  });

  console.log('Admin yaradıldı:', admin);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
