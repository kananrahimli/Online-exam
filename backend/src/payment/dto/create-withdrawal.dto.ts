import { IsNumber, IsPositive, IsOptional, IsString } from 'class-validator';

export class CreateWithdrawalDto {
  @IsNumber()
  @IsPositive({ message: 'Məbləğ müsbət olmalıdır' })
  amount: number;

  @IsOptional()
  @IsString()
  bankAccount?: string; // JSON formatında bank hesabı məlumatları

  @IsOptional()
  @IsString()
  notes?: string;
}

