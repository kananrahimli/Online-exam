import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class UpdateBankAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'Hesab nömrəsi tələb olunur' })
  accountNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'Bank adı tələb olunur' })
  bankName: string;

  @IsString()
  @IsNotEmpty({ message: 'Hesab sahibinin adı tələb olunur' })
  accountHolderName: string;

  @IsOptional()
  @IsString()
  iban?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Telefon nömrəsi düzgün formatda deyil (məs: +994501234567)',
  })
  phoneNumber?: string; // MPAY wallet üçün telefon nömrəsi
}

