import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateWorkplaceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsIn(['spa', 'clinic'])
  kind: 'spa' | 'clinic';
}
