import { IsEmail, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Düzgün email ünvanı daxil edin' })
  email: string;
}
