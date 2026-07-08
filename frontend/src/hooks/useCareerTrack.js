/**
 * useCareerTrack
 * -------------
 * Returns the current user's career track and the problem categories
 * that belong to it. Used by the Arena to filter challenges.
 *
 * Usage:
 *   const { track, categories, loading } = useCareerTrack();
 */
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export function useCareerTrack() {
  const { user } = useAuth();
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    async function load() {
      // Get profile with career_track_slug
      const { data: profile } = await supabase
        .from("profiles")
        .select("career_track_slug")
        .eq("id", user.id)
        .single();

      if (!profile?.career_track_slug) {
        setLoading(false);
        return;
      }

      // Get full track detail
      const { data: ct } = await supabase
        .from("career_tracks")
        .select("*")
        .eq("slug", profile.career_track_slug)
        .single();

      setTrack(ct || null);
      setLoading(false);
    }

    load();
  }, [user]);

  return {
    track,
    // Categories this career track covers — use to filter Arena problems
    categories: track?.problem_categories ?? null,
    // null means "show all" (no track selected yet)
    hasTrack: !!track,
    loading,
  };
}

/**
 * getArenaFilterForTrack
 * ----------------------
 * Returns a Supabase query modifier that filters problems to the
 * user's career track categories. Call this on your problems query.
 *
 * Example:
 *   let q = supabase.from("problems").select("*");
 *   q = getArenaFilterForTrack(q, categories);
 *   const { data } = await q;
 */
export function getArenaFilterForTrack(query, categories) {
  if (!categories || categories.length === 0) return query;
  return query.in("category", categories);
}
