import { IsNumber, IsPositive } from 'class-validator';

export class AddBalanceDto {
  @IsNumber()
  @IsPositive({ message: 'Məbləğ müsbət olmalıdır' })
  amount: number;
}
