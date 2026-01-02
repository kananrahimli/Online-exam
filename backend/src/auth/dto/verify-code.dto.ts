import { IsEmail, IsString } from 'class-validator';

export class VerifyCodeDto {
  @IsEmail({}, { message: 'Düzgün email ünvanı daxil edin' })
  email: string;

  @IsString()
  code: string; // Verification code
}

