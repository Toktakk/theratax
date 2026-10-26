import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { MASSAGE_TYPES } from '../massage-type.js';
import type { MassageType } from '../massage-type.js';

export class CreateTransactionDto {
  @IsIn(['income', 'expense'])
  type: 'income' | 'expense';

  @IsOptional()
  @Matches(/^\d{2}-\d{2}-\d{4}$/)
  occurredOn?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  amountPence?: number;

  @IsOptional()
  @IsString()
  categorySlug?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  miles?: number;

  @IsOptional()
  @IsIn(MASSAGE_TYPES)
  massageType?: MassageType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  customMassageType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  basePence?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  additionalFeePence?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  bonusPence?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  minutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  workplaceId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  clientId?: number;
}