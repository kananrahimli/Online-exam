import { IsString, IsOptional } from 'class-validator';

export class SubmitAnswersDto {
  @IsString()
  questionId: string;

  @IsOptional()
  @IsString()
  optionId?: string;

  @IsOptional()
  @IsString()
  content?: string;
}
