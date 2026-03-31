import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ecmeafiajoksyeuisreh.supabase.co'
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbWVhZmlham9rc3lldWlzcmVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDA3MjYzOCwiZXhwIjoyMDg5NjQ4NjM4fQ.leU8zdVO_gby-lhQ1GfgVcynGfkP2tHQjAGp9kxRNJA'

export const supabase = createClient(url, key)
