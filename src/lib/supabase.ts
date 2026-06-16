import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://befseqlhazkxujdhxbpb.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlZnNlcWxoYXpreHVqZGh4YnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1OTA2ODQsImV4cCI6MjA5NzE2NjY4NH0.53g6BDhRbfurJbbu1m_ETlvpFGIMWkU-3sBwK7E1IIc';

export const supabase = createClient(supabaseUrl, supabaseKey);
