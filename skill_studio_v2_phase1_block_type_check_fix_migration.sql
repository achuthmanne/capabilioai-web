-- Skill Studio V2 Phase 1 hotfix (2026-07-30) — production incident.
--
-- contentGenerator.js's BLOCK_TYPES array and blocksFromLesson() were updated
-- to emit five new block types (hook, worked_example, common_mistake,
-- checkpoint_question, diagram_spec) as part of Phase 1's richer lesson
-- schema, but the ACTUAL Postgres CHECK constraint on
-- module_content_blocks.block_type was never altered to match — it was only
-- updated in application-layer code (a JS array), not the database's own
-- enforcement of that same rule. Every fresh module generation (a genuine
-- cache-miss — most modules were already cached from before Phase 1 shipped)
-- failed with:
--   "new row for relation "module_content_blocks" violates check constraint
--   "module_content_blocks_block_type_check""
-- This is exactly the "don't modify code in isolation — trace the full flow
-- from UI to DB" mistake: the JS-side allow-list and the DB-side allow-list
-- drifted because only one of the two was ever changed. Applied live via
-- Supabase MCP as an emergency fix; this file is the tracked repo record.
alter table module_content_blocks drop constraint module_content_blocks_block_type_check;
alter table module_content_blocks add constraint module_content_blocks_block_type_check
  check (block_type = ANY (ARRAY[
    'overview'::text, 'ai_explanation'::text, 'visual'::text, 'playground_config'::text,
    'example'::text, 'cheat_sheet'::text, 'summary'::text, 'common_mistakes'::text,
    'hook'::text, 'worked_example'::text, 'common_mistake'::text,
    'checkpoint_question'::text, 'diagram_spec'::text
  ]));
