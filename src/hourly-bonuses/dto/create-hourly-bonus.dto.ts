import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateHourlyBonusDto {
  @IsInt()
  @Min(1)
  workplaceId: number;

  @IsOptional()
  @Matches(/^\d{2}-\d{2}-\d{4}$/)
  occurredOn?: string;

  @IsInt()
  @Min(1)
  @Max(1440)
  eligibleMinutes: number;

  @IsInt()
  @Min(1)
  @Max(100_000_000)
  ratePencePerHour: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  note?: string;
}
