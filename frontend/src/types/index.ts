export interface User {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string;
  background_url?: string;
  details?: string;
  subscription_tier?: string;
  credits_balance?: number;
  created_at?: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface ApiError {
  detail: string;
}
