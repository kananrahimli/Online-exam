import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType } from '@prisma/client';

class ReadingTextDto {
  @IsString()
  content: string;
}

class OptionDto {
  @IsString()
  content: string;
}

class QuestionDto {
  @IsEnum(QuestionType)
  type: QuestionType;

  @IsString()
  content: string;

  @IsNumber()
  @Min(1)
  points?: number;

  @IsOptional()
  @IsString()
  correctAnswer?: string;

  @IsOptional()
  @IsString()
  modelAnswer?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options?: OptionDto[];
}

class TopicDto {
  @IsString()
  name: string;

  @IsString()
  subject: string; // Fənn adı (məs: Riyaziyyat, Azərbaycan dili)

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  points?: number; // Default points per question in this topic

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions?: QuestionDto[];
}

export class CreateExamDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  subject: string;

  @IsString()
  level: string;

  @IsNumber()
  @IsIn([60, 120, 180]) // Only 1 hour, 2 hours, or 3 hours allowed
  duration: number; // in minutes: 60 (1 saat = 3 AZN), 120 (2 saat = 5 AZN), 180 (3 saat = 10 AZN)

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TopicDto)
  topics?: TopicDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions?: QuestionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReadingTextDto)
  readingTexts?: ReadingTextDto[];
}
