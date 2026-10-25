import { IsIn } from 'class-validator';

export class OnboardingDto {
  @IsIn(['mobile', 'fixedLocation', 'mixed'])
  practiceType: 'mobile' | 'fixedLocation' | 'mixed';

  @IsIn(['flat_rate', 'actual_cost'])
  expenseMethod: 'flat_rate' | 'actual_cost';
}