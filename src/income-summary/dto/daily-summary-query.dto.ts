import { IsOptional, Matches } from 'class-validator';

export class DailySummaryQueryDto {
  @IsOptional()
  @Matches(/^\d{2}-\d{2}-\d{4}$/)
  date?: string;
}
