import 'dotenv/config'
import { supabaseAdmin } from './backend/server/lib/supabase.js'
async function check() {
  const { data, error } = await supabaseAdmin.from('profiles').select('*')
  console.log('Profiles:', data)
}
check()
