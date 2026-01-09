import { createClient } from '@supabase/supabase-js';

// Supabase configuration using environment variables
// Set these in your .env file or Expo environment
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://zengdjsrnqzhxzibsldh.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';


// Check if Supabase is properly configured
// Supabase anon keys are JWTs that start with "eyJ" and are typically 200+ characters
export const isSupabaseConfigured = 
  supabaseAnonKey.length > 50 && 
  supabaseAnonKey.startsWith('eyJ') &&
  supabaseUrl.includes('supabase.co');

// Create the Supabase client
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || 'placeholder-key-replace-me',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// Error message for unconfigured Supabase
export const SUPABASE_NOT_CONFIGURED_ERROR = {
  message: 'Supabase is not configured. Please set EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable with your anon public key from the Supabase dashboard.',
  name: 'SupabaseNotConfiguredError',
};

export interface Project {
  id: string;
  user_id: string;
  project_name: string;
  state: string;
  status: 'draft' | 'pending' | 'sent' | 'delivered' | 'signed';
  deadline: string | null;
  job_start_date: string;
  property_address: string;
  property_owner_name: string;
  property_owner_address: string;
  general_contractor_name?: string;
  general_contractor_address?: string;
  lender_name?: string;
  lender_address?: string;
  description: string;
  contract_amount: number;
  notice_required: boolean;
  delivery_method?: 'email' | 'esign' | 'mail';
  tracking_number?: string;
  proof_of_service?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectTemplate {
  id: string;
  user_id: string;
  template_name: string;
  state?: string;
  general_contractor_name?: string;
  general_contractor_address?: string;
  lender_name?: string;
  lender_address?: string;
  description?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}


export const NO_NOTICE_STATES = ['New York', 'Pennsylvania', 'Indiana', 'Vermont', 'New Hampshire', 'Rhode Island', 'Connecticut', 'Delaware', 'Maryland', 'Virginia', 'West Virginia', 'Kentucky', 'North Carolina', 'South Carolina'];

export const STATE_DEADLINES: Record<string, number> = {
  'California': 20, 'Texas': 15, 'Florida': 45, 'Arizona': 20, 'Nevada': 31, 'Colorado': 10, 'Washington': 60, 'Oregon': 8, 'Utah': 20, 'New Mexico': 60, 'Montana': 20, 'Idaho': 20, 'Wyoming': 30, 'North Dakota': 40, 'South Dakota': 45, 'Nebraska': 60, 'Kansas': 30, 'Oklahoma': 75, 'Missouri': 60, 'Iowa': 30, 'Minnesota': 45, 'Wisconsin': 60, 'Illinois': 60, 'Michigan': 20, 'Ohio': 21, 'Tennessee': 90, 'Georgia': 30, 'Alabama': 30, 'Mississippi': 15, 'Louisiana': 30, 'Arkansas': 75, 'Maine': 30, 'Massachusetts': 60, 'Alaska': 15, 'Hawaii': 45, 'District of Columbia': 30,
};

export const US_STATES = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'];

export function calculateDeadline(state: string, jobStartDate: Date): Date | null {
  const days = STATE_DEADLINES[state];
  if (!days) return null;
  const deadline = new Date(jobStartDate);
  deadline.setDate(deadline.getDate() + days);
  return deadline;
}

export function isNoticeRequired(state: string): boolean {
  return !NO_NOTICE_STATES.includes(state);
}
