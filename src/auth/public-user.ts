export interface PublicUser {
    id: number;
    email: string;
    name: string;
    practiceType: 'mobile' | 'fixedLocation' | 'mixed' | null;
    expenseMethod: 'flat_rate' | 'actual_cost' | null;
    onboardedAt: string | null;
    addressLine1?: string;
    addressLine2?: string;
    town?: string;
    postcode?: string;
  }
  
  export interface AuthResponse {
    accessToken: string;
    user: PublicUser;
  }