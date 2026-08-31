import 'dotenv/config'
import { supabaseAdmin } from './backend/server/lib/supabase.js'

async function test() {
  const cardId = '6ebf9e5d-a0f1-4add-a12b-2e841b003aaa'
  
  const { data: updatedCard, error: updateError } = await supabaseAdmin
      .from("user_weekly_cards")
      .update({
        is_scratched: true,
        assigned_questions: ['0a6347bb-7d5c-4abc-a3ce-b394429d6984']
      })
      .eq("id", cardId)
      .select()
      .single()

  console.log('Update Error:', updateError)
  console.log('Updated Card:', updatedCard)
}
test()
