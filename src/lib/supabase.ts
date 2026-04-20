import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!url || !key) {
  throw new Error('[supabase] NEXT_PUBLIC_SUPABASE_URL 및 NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 필요합니다.')
}

export const SB_URL = url
export const SB_KEY = key
export const SB_HDR = { apikey: key, Authorization: `Bearer ${key}` } as const

export const supabase = createClient(url, key)
