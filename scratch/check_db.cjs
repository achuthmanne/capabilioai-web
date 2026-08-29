const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('community_posts').select('*').limit(1);
  if (error && error.code === '42P01') {
      console.log('TABLE DOES NOT EXIST');
  } else {
      console.log('TABLE EXISTS OR OTHER ERROR:', error, data);
  }
}
run();
