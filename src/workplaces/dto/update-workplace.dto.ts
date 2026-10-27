import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { HourExtraDto } from '../../hour-extras/hour-extra.dto.js';

export class UpdateWorkplaceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsInt()
  @Min(1)
  @Max(100_000_000)
  hourRatePence: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HourExtraDto)
  hourExtras: HourExtraDto[];
}
