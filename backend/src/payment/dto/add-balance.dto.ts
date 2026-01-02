import { IsNumber, IsPositive, IsOptional, IsString } from 'class-validator';

export class AddBalanceDto {
  @IsNumber()
  @IsPositive({ message: 'Məbləğ müsbət olmalıdır' })
  amount: number;

  @IsOptional()
  @IsString()
  examId?: string; // Əgər verilərsə, imtahanın qiyməti qədər balans artırılacaq
}
