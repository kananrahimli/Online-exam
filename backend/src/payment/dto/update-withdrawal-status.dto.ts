import { IsEnum, IsOptional, IsString } from 'class-validator';
import { WithdrawalStatus } from '@prisma/client';

export class UpdateWithdrawalStatusDto {
  @IsEnum(WithdrawalStatus, { message: 'Düzgün status seçin' })
  status: WithdrawalStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
