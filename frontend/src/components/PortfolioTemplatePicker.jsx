// PortfolioTemplatePicker.jsx — for Aura dashboard
import { useState } from "react";
import { TEMPLATES, TEMPLATE_PACKS } from "./portfolioTemplates";

export default function PortfolioTemplatePicker({ userId, currentTemplate, purchasedTemplates = {}, onSave }) {
  const [selected, setSelected] = useState(currentTemplate);
  const [saving, setSaving] = useState(false);
  const [showPackModal, setShowPackModal] = useState(false);

  const isOwned = (id) => purchasedTemplates[id] === true || TEMPLATES[id]?.tier === "free";

  const handleSelect = async (id) => {
    if (!isOwned(id)) {
      setShowPackModal(true);
      return;
    }
    setSelected(id);
  };

  const handleSave = async () => {
    if (!userId || selected === currentTemplate) return;
    setSaving(true);
    try {
      await import("../lib/db").then(m => m.userDoc.update(userId, { portfolioTemplate: selected }));
      if (onSave) onSave(selected);
    } catch (err) {
      console.error("Failed to save template", err);
    }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Choose your portfolio template</h3>
      <p style={{ fontSize: 13, color: "#6B6B68", marginBottom: 24 }}>Recruiters see this layout when they view your public profile.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
        {Object.entries(TEMPLATES).map(([id, tpl]) => {
          const owned = isOwned(id);
          const isSelected = selected === id;
          return (
            <div
              key={id}
              onClick={() => handleSelect(id)}
              style={{
                cursor: "pointer",
                borderRadius: 16,
                overflow: "hidden",
                border: isSelected ? `2px solid ${tpl.thumbnail.accent || "#3D4EAC"}` : "1px solid #E8E8E1",
                background: "#fff",
                transition: "all 0.2s",
                opacity: owned ? 1 : 0.7,
              }}
            >
              {/* Thumbnail mock */}
              <div style={{ height: 140, background: tpl.thumbnail.bg, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, background: tpl.thumbnail.headerBg, height: "40%", top: 0 }} />
                <div style={{ position: "absolute", bottom: 12, left: 12, right: 12, height: 40, background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }} />
                <div style={{ position: "absolute", bottom: 20, left: 20, width: 60, height: 60, borderRadius: "50%", background: tpl.thumbnail.accent, opacity: 0.8 }} />
              </div>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{tpl.name}</span>
                  {tpl.tier !== "free" && <span style={{ fontSize: 9, background: "#FDF3E7", color: "#B8620A", padding: "2px 8px", borderRadius: 99 }}>{tpl.tier === "basic" ? "₹49" : "₹99"}</span>}
                </div>
                <p style={{ fontSize: 12, color: "#6B6B68", margin: "0 0 8px 0" }}>{tpl.description}</p>
                <div style={{ fontSize: 11, color: "#9A9A97" }}>Best for: {tpl.bestFor}</div>
                {!owned && (
                  <div style={{ marginTop: 10, fontSize: 11, color: "#B8620A", display: "flex", alignItems: "center", gap: 4 }}>
                    <span>🔒</span> {tpl.tier === "basic" ? "Basic plan required" : "Gold plan required"}
                  </div>
                )}
                {isSelected && <div style={{ marginTop: 10, color: "#1A7A4A", fontSize: 11, fontWeight: 600 }}>✓ Active</div>}
              </div>
            </div>
          );
        })}
      </div>

      {selected !== currentTemplate && (
        <div style={{ marginTop: 28, textAlign: "center" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "12px 32px",
              background: "#3D4EAC",
              border: "none",
              borderRadius: 40,
              color: "#fff",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {saving ? "Saving…" : "Apply template"}
          </button>
        </div>
      )}

      {showPackModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 24, maxWidth: 480, width: "100%", padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎁</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Unlock this template</h3>
            <p style={{ fontSize: 14, color: "#6B6B68", marginBottom: 20 }}>Get all 5 professional templates with the Portfolio Pro Pack.</p>
            <div style={{ background: "#F6F6F1", borderRadius: 16, padding: "16px 20px", marginBottom: 20, textAlign: "left" }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>📦 Portfolio Pro Pack</div>
              <div style={{ fontSize: 13, color: "#3A3A38", marginBottom: 4 }}>All 5 professional templates</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#3D4EAC" }}>₹299 <span style={{ fontSize: 12, fontWeight: 400, color: "#9A9A97" }}>one-time</span></div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setShowPackModal(false)} style={{ flex: 1, padding: "10px", background: "#EFEFE9", border: "none", borderRadius: 12, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={() => alert("Redirect to payment page")} style={{ flex: 1, padding: "10px", background: "#3D4EAC", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Upgrade Now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}