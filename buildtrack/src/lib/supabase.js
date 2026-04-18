// Подключи Supabase после создания проекта на supabase.com
// Скопируй .env.example → .env и заполни переменные

import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

// Клиент будет null пока не заполнен .env — приложение работает на локальных данных
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null
