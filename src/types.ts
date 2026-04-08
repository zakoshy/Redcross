export type UserRole = 'admin' | 'volunteer' | 'merchant' | 'victim';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
  national_id?: string;
  phone_number?: string;
  county?: string;
  created_at: string;
}

export interface Wallet {
  id: string;
  profile_id: string;
  balance: number;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  amount_per_victim: number;
  status: 'active' | 'completed';
  created_at: string;
}

export interface LedgerEntry {
  id: number;
  wallet_id: string;
  campaign_id?: string;
  amount: number;
  transaction_type: 'AID_DISBURSEMENT' | 'PURCHASE' | 'FUNDS_RETURN';
  idempotency_key: string;
  description: string;
  created_at: string;
  metadata?: any;
}

export interface TriageSession {
  id: number;
  victim_id: string;
  volunteer_id?: string;
  last_message: string;
  risk_score: number;
  escalated: boolean;
  notes: string;
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
}
