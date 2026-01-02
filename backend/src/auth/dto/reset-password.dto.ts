import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Düzgün email ünvanı daxil edin' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Şifrə ən azı 6 simvoldan ibarət olmalıdır' })
  newPassword: string;

  @IsOptional()
  @IsString()
  resetToken?: string; // Token from verify-code endpoint

  @IsOptional()
  @IsString()
  code?: string; // Verification code (legacy support)
}
