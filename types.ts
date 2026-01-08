export interface Customer {
  id: string;
  name: string;
  phone: string;
  created_at: string;
}

export interface Message {
  id: string;
  customer_id: string;
  content: string;
  created_at: string;
  status: 'sent' | 'delivered' | 'read';
  from_me: boolean;
  evolution_msg_id?: string;
}

export interface EvolutionConfig {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}