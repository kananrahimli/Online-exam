import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class WithdrawDto {
  @IsNumber()
  @IsPositive({ message: 'Məbləğ müsbət olmalıdır' })
  amount: number;

  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Bank hesabı ən azı 10 simvol olmalıdır' })
  bankAccount?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Bank adı ən azı 2 simvol olmalıdır' })
  bankName?: string;
}
