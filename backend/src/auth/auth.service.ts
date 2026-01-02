import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, phone, password, firstName, lastName, role, teacherIds } =
      registerDto;

    // Check if user exists by email
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUserByEmail) {
      throw new ConflictException('Bu email ünvanı artıq istifadə olunur');
    }

    // Check if user exists by phone (if provided)
    if (phone) {
      const existingUserByPhone = await this.prisma.user.findUnique({
        where: { phone },
      });

      if (existingUserByPhone) {
        throw new ConflictException('Bu telefon nömrəsi artıq istifadə olunur');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        phone: phone || null,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || 'STUDENT',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // If student and teacherIds provided, create teacher-student relations
    if (user.role === 'STUDENT' && teacherIds && teacherIds.length > 0) {
      // Verify all teachers exist
      const teachers = await this.prisma.user.findMany({
        where: {
          id: { in: teacherIds },
          role: 'TEACHER',
        },
      });

      if (teachers.length !== teacherIds.length) {
        throw new ConflictException(
          'Seçilmiş müəllimlərdən bəziləri mövcud deyil',
        );
      }

      // Create teacher-student relations
      await this.prisma.teacherStudent.createMany({
        data: teacherIds.map((teacherId) => ({
          studentId: user.id,
          teacherId,
        })),
        skipDuplicates: true,
      });
    }

    // Generate token
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user,
      token,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Email və ya şifrə yanlışdır');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      throw new UnauthorizedException('Email və ya şifrə yanlışdır');
    }

    // Generate token
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        balance: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('İstifadəçi tapılmadı');
    }

    return user;
  }

  async getTeachers() {
    return this.prisma.user.findMany({
      where: {
        role: 'TEACHER',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async updateProfile(
    userId: string,
    updateData: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('İstifadəçi tapılmadı');
    }

    // Check if email is already taken by another user
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateData.email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException(
          'Bu email ünvanı başqa istifadəçi tərəfindən istifadə olunur',
        );
      }
    }

    // Check if phone is already taken by another user (if provided and different)
    if (updateData.phone !== undefined) {
      const phoneValue =
        updateData.phone && updateData.phone.trim() !== ''
          ? updateData.phone.trim()
          : null;

      if (phoneValue && phoneValue !== user.phone) {
        const existingUser = await this.prisma.user.findUnique({
          where: { phone: phoneValue },
        });

        if (existingUser && existingUser.id !== userId) {
          throw new ConflictException(
            'Bu telefon nömrəsi başqa istifadəçi tərəfindən istifadə olunur',
          );
        }
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(updateData.firstName && { firstName: updateData.firstName }),
        ...(updateData.lastName && { lastName: updateData.lastName }),
        ...(updateData.email && { email: updateData.email }),
        ...(updateData.phone !== undefined && {
          phone:
            updateData.phone && updateData.phone.trim() !== ''
              ? updateData.phone.trim()
              : null,
        }),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        balance: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        balance: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('İstifadəçi tapılmadı');
    }

    return { balance: user.balance };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(
        'Bu email ünvanı ilə qeydiyyatdan keçmiş istifadəçi tapılmadı',
      );
    }

    // Generate a simple 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store verification code in database with expiry (2 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 2);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: code,
        resetTokenExpires: expiresAt,
      },
    });

    // Send email with verification code
    try {
      await this.emailService.sendVerificationCode(email, code);

      if (process.env.NODE_ENV !== 'production') {
        console.log(`✅ Verification code sent to ${email}`);
      }
    } catch (error: any) {
      // If email sending fails, we should clear the reset token
      // so user can request a new code
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: null,
          resetTokenExpires: null,
        },
      });

      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Failed to send email:', error.message);
      }

      throw new BadRequestException(
        error.message ||
          'Email göndərilərkən xəta baş verdi. Zəhmət olmasa daha sonra yenidən cəhd edin.',
      );
    }

    return {
      message: 'Verifikasiya kodu email ünvanınıza göndərildi',
    };
  }

  async verifyCode(verifyCodeDto: VerifyCodeDto) {
    const { email, code } = verifyCodeDto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(
        'Bu email ünvanı ilə qeydiyyatdan keçmiş istifadəçi tapılmadı',
      );
    }

    // Verify the code
    if (!user.resetToken || user.resetToken !== code) {
      throw new BadRequestException('Verifikasiya kodu yanlışdır');
    }

    // Check if code has expired
    if (!user.resetTokenExpires || new Date() > user.resetTokenExpires) {
      throw new BadRequestException(
        'Verifikasiya kodu müddəti bitib. Zəhmət olmasa yeni kod tələb edin',
      );
    }

    // Generate temporary token for password reset (valid for 10 minutes)
    const resetToken = this.jwtService.sign(
      { sub: user.id, email: user.email, type: 'password-reset' },
      { expiresIn: '10m' },
    );

    return {
      message: 'Verifikasiya kodu düzgündür',
      resetToken,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, newPassword, resetToken, code } = resetPasswordDto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(
        'Bu email ünvanı ilə qeydiyyatdan keçmiş istifadəçi tapılmadı',
      );
    }

    // If resetToken is provided, verify it
    if (resetToken) {
      try {
        const decoded = this.jwtService.verify(resetToken);
        if (
          decoded.type !== 'password-reset' ||
          decoded.email !== email ||
          decoded.sub !== user.id
        ) {
          throw new BadRequestException('Token yanlışdır və ya müddəti bitib');
        }
      } catch (error) {
        throw new BadRequestException(
          'Token yanlışdır və ya müddəti bitib. Zəhmət olmasa yenidən kod tələb edin',
        );
      }
    } else if (code) {
      // Legacy support: verify the code
      if (!user.resetToken || user.resetToken !== code) {
        throw new BadRequestException('Verifikasiya kodu yanlışdır');
      }

      // Check if code has expired
      if (!user.resetTokenExpires || new Date() > user.resetTokenExpires) {
        throw new BadRequestException(
          'Verifikasiya kodu müddəti bitib. Zəhmət olmasa yeni kod tələb edin',
        );
      }
    } else {
      throw new BadRequestException('Token və ya kod tələb olunur');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await this.prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return {
      message: 'Şifrə uğurla dəyişdirildi',
    };
  }
}
