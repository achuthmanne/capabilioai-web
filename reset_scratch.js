import 'dotenv/config'
import { supabaseAdmin } from './backend/server/lib/supabase.js'

async function reset() {
  const cardId = '6ebf9e5d-a0f1-4add-a12b-2e841b003aaa'
  
  const { data: updatedCard, error: updateError } = await supabaseAdmin
      .from("user_weekly_cards")
      .update({
        is_scratched: false,
        assigned_questions: null,
        completed_questions: []
      })
      .eq("id", cardId)
      .select()
      .single()

  console.log('Update Error:', updateError)
  console.log('Updated Card:', updatedCard)
}
reset()
