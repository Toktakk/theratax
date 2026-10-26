import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class TaxSummaryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  taxYear?: number;
}
