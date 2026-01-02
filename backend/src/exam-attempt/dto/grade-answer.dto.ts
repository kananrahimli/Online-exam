import { IsNumber, Min, Max } from 'class-validator';

export class GradeAnswerDto {
  @IsNumber()
  @Min(0)
  points: number;
}
