import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateWorkplaceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsIn(['spa', 'clinic'])
  kind: 'spa' | 'clinic';

  @IsInt()
  @Min(1)
  @Max(100_000_000)
  hourRatePence: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  pregnancyExtraPence?: number;
}
