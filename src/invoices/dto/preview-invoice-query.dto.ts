import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class PreviewInvoiceQueryDto {
  @IsIn(['spa', 'clinic', 'client'])
  recipientKind: 'spa' | 'clinic' | 'client';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  workplaceId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clientId?: number;

  @IsIn(['day', 'month'])
  period: 'day' | 'month';

  @IsOptional()
  @Matches(/^\d{2}-\d{2}-\d{4}$/)
  date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @IsOptional()
  @Matches(/^\d{2}-\d{2}-\d{4}$/)
  issuedOn?: string;
}
