export interface PublicUser {
    id: number;
    email: string;
    name: string;
    practiceType: 'mobile' | 'fixedLocation' | 'mixed' | null;
    expenseMethod: 'flat_rate' | 'actual_cost' | null;
    onboardedAt: string | null;
  }
  
  export interface AuthResponse {
    accessToken: string;
    user: PublicUser;
  }