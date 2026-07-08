import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const ICON_BG = {
  "📡": "bg-blue-50 border-blue-200",
  "⚡": "bg-yellow-50 border-yellow-200",
  "⚙️": "bg-gray-50 border-gray-200",
  "🏗️": "bg-orange-50 border-orange-200",
  "💊": "bg-green-50 border-green-200",
  "📊": "bg-purple-50 border-purple-200",
  "🤖": "bg-indigo-50 border-indigo-200",
  "🌐": "bg-teal-50 border-teal-200",
  "💻": "bg-sky-50 border-sky-200",
  "🖥️": "bg-slate-50 border-slate-200",
};

export default function CareerPicker({ user }) {
  const [tracks, setTracks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    async function load() {
      const [{ data: tData }, { data: profile }] = await Promise.all([
        supabase.from("career_tracks").select("*").eq("is_active", true).order("branch"),
        supabase.from("profiles").select("career_track_slug").eq("id", user.id).single(),
      ]);
      setTracks(tData || []);
      if (profile?.career_track_slug) {
        setCurrent(profile.career_track_slug);
        setSelected(profile.career_track_slug);
      }
      setLoading(false);
    }
    if (user) load();
  }, [user]);

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ career_track_slug: selected, career_selected_at: new Date().toISOString() })
      .eq("id", user.id);
    window.location.href = "/";
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Choose Your Career Track
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Capabilio is for <strong>every engineering student</strong> — not just IT.
            Select your stream and we'll show you challenges built for your career.
          </p>
          {current && (
            <div className="mt-3 inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-sm">
              <span>Current:</span>
              <span className="font-medium">
                {tracks.find((t) => t.slug === current)?.name}
              </span>
            </div>
          )}
        </div>

        {/* Track Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {tracks.map((track) => {
            const isSelected = selected === track.slug;
            const bg = ICON_BG[track.icon] || "bg-white border-gray-200";
            return (
              <button
                key={track.slug}
                onClick={() => setSelected(track.slug)}
                className={`text-left p-5 rounded-2xl border-2 transition-all duration-150 ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-50 shadow-lg scale-[1.02]"
                    : `${bg} hover:border-indigo-300 hover:shadow-md`
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{track.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                      {track.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {track.branch}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <p className="mt-3 text-xs text-gray-500 leading-relaxed line-clamp-2">
                  {track.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {track.problem_categories.slice(0, 3).map((cat) => (
                    <span key={cat} className="text-[10px] bg-white border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">
                      {cat}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected track detail */}
        {selected && (() => {
          const t = tracks.find((x) => x.slug === selected);
          if (!t) return null;
          return (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{t.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{t.name}</h3>
                  <p className="text-sm text-gray-400">{t.branch}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">{t.description}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase mb-2">Challenge Categories</p>
                  <div className="flex flex-wrap gap-1.5">
                    {t.problem_categories.map((c) => (
                      <span key={c} className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-1 rounded-lg font-medium">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase mb-2">Hiring Companies</p>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {t.sample_companies?.slice(0, 5).join(", ")}
                    {t.sample_companies?.length > 5 ? " & more" : ""}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* CTA */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!selected || saving}
            className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : current ? "Update My Track →" : "Start My Career Journey →"}
          </button>
          {current && (
            <button
              onClick={() => { window.location.href = "/" }}
              className="py-3.5 px-5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Skip
            </button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          You can always change your track later from your Profile settings.
        </p>
      </div>
    </div>
  );
}
