import { createClient } from '@supabase/supabase-js';

// No navegador, process.env não existe da mesma forma que no Node.js
// Usamos uma verificação segura para evitar o erro de "process is not defined"
const getEnv = (key: string, fallback: string) => {
  try {
    // Tenta acessar via import.meta.env (padrão Vite/Moderno) ou retorna o fallback
    // @ts-ignore
    return (import.meta.env && import.meta.env[key]) || fallback;
  } catch {
    return fallback;
  }
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL', 'https://rrcechbbdyfrsmqpbanl.supabase.co');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyY2VjaGJiZHlmcnNtcXBiYW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDM3NTksImV4cCI6MjA4MzQ3OTc1OX0.xgSX5_vGsTonZFHZefXhIVL8cIYQv8exO1tAYbvEmyc');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export class SupabaseService {
  static async getCustomers() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  static async addCustomer(name: string, phone: string) {
    const { data, error } = await supabase
      .from('customers')
      .insert([{ name, phone }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async updateCustomer(id: string, name: string, phone: string) {
    const { data, error } = await supabase
      .from('customers')
      .update({ name, phone })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getMessages(customerId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  static async saveMessage(message: any) {
    const { data, error } = await supabase
      .from('messages')
      .insert([message])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}