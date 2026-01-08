import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const email = 'admin@gmail.com';
    const password = 'Everest-8848!!';
    
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      console.log('❌ Admin istifadəçisi artıq mövcuddur:', email);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
      },
    });

    console.log('✅ Admin istifadəçisi uğurla yaradıldı!');
    console.log('📧 Email:', admin.email);
    console.log('👤 Ad:', admin.firstName, admin.lastName);
    console.log('🔑 Role:', admin.role);
    console.log('🆔 ID:', admin.id);
  } catch (error) {
    console.error('❌ Xəta:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();

