import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { QuestionType } from '@prisma/client';

export class GenerateExamDto {
  @IsString()
  subject: string;

  @IsString()
  level: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  questionCount: number;

  @IsArray()
  @IsEnum(QuestionType, { each: true })
  @ArrayMinSize(1)
  questionTypes: QuestionType[];

  @IsOptional()
  @IsString()
  readingText?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  readingQuestionCount?: number;
}
