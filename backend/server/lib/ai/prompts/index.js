/**
 * prompts/index.js — Phase 2.7.
 *
 * The actual aggregator: imports every feature prompt file for its
 * registerPrompt(...) side-effects. Depends on registry.js (via each
 * feature file); registry.js never depends on this file or on any
 * feature file — that one-way direction is what keeps the module graph
 * acyclic. aiService.js imports this file (not registry.js directly) so
 * every prompt is guaranteed registered before any getPrompt() lookup
 * can run.
 */
import "./arena.js" // Batch 1
import "./skillStudio.js" // Batch 2
