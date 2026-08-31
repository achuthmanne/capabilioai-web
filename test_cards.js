import 'dotenv/config'
import { supabaseAdmin } from './backend/server/lib/supabase.js'
async function check() {
  const { data, error } = await supabaseAdmin.from('user_weekly_cards').select('*')
  console.log(data)
}
check()
