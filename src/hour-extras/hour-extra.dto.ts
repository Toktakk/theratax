import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { HOUR_EXTRA_TYPES } from './hour-extra.js';
import type { HourExtraType } from './hour-extra.js';

export class HourExtraDto {
  @IsIn(HOUR_EXTRA_TYPES)
  massageType: HourExtraType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  customMassageType?: string;

  @IsInt()
  @Min(1)
  @Max(100_000_000)
  extraPence: number;
}
