// ════════════════════════════════════════════════════════════════
// TEMPLATE GALLERY — Canva-style picker inside Aura dashboard
// ════════════════════════════════════════════════════════════════
import { useState, useRef } from "react"
import { userDoc } from "../lib/db"
import { TEMPLATES } from "./PortfolioTemplates"
import { TemplateComponents, PDFRenderer } from "./PortfolioPDFRenderer"
import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"

const API = import.meta.env.VITE_API_URL || "https://capabilio-server.onrender.com"

// Mini thumbnail preview for each template
function TemplateThumbnail({ template, active, owned, onClick }) {
  const t = template.thumbnail
  return (
    <div onClick={onClick}
      style={{ cursor: "pointer", borderRadius: 12, overflow: "hidden",
        border: `2px solid ${active ? "#6366F1" : "rgba(0,0,0,0.05)"}`,
        transition: "all 0.2s", background: "#0f172a",
        boxShadow: active ? "0 0 20px rgba(99,102,241,0.3)" : "none" }}>
      {/* Mini A4 preview */}
      <div style={{ height: 140, background: t.bg, position: "relative", overflow: "hidden" }}>
        {/* Header bar */}
        <div style={{ background: t.headerBg, height: 40, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ width: 60, height: 6, background: t.bg === "#FFFFFF" ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.6)", borderRadius: 3, marginBottom: 4 }} />
            <div style={{ width: 40, height: 4, background: t.accent, borderRadius: 3 }} />
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ width: 24, height: 8, background: t.accent, borderRadius: 2 }} />
          </div>
        </div>
        {/* Body preview */}
        <div style={{ padding: "10px 12px" }}>
          {[80, 60, 70, 50].map((w, i) => (
            <div key={i} style={{ height: 4, width: `${w}%`, background: t.text === "#FFFFFF" ? "#e5e7eb" : "rgba(30,41,59,0.15)", borderRadius: 2, marginBottom: 5 }} />
          ))}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {[40, 55, 45].map((w, i) => (
              <div key={i} style={{ height: 18, width: `${w}%`, background: t.accent + "20", border: `1px solid ${t.accent}40`, borderRadius: 3 }} />
            ))}
          </div>
        </div>
        {!owned && (
          <div style={{ position: "absolute", top: 8, right: 8,
            background: "rgba(0,0,0,0.75)", borderRadius: 4,
            padding: "2px 7px", fontSize: 9, fontWeight: 800,
            color: template.tier === "gold" ? "#FFD700" : "#f1f5f9" }}>
            {template.tier === "gold" ? "✦ ₹99" : "🔒 ₹49"}
          </div>
        )}
        {active && (
          <div style={{ position: "absolute", bottom: 6, right: 6,
            background: "#6366F1", borderRadius: 20,
            padding: "2px 8px", fontSize: 9, fontWeight: 800, color: "#fff" }}>
            ● Active
          </div>
        )}
      </div>
      <div style={{ padding: "10px 12px", background: "#FFFFFF" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9" }}>{template.name}</div>
        <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{template.bestFor}</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: template.tier === "free" ? "#78FF9E" : template.tier === "gold" ? "#FFD700" : "#94a3b8", marginTop: 4 }}>
          {template.tier === "free" ? "Free" : template.tier === "gold" ? "Gold ₹99" : "Basic ₹49"}
        </div>
      </div>
    </div>
  )
}

export default function TemplateGallery({ user, userData, onClose }) {
  const [selectedTemplate, setSelectedTemplate] = useState(userData?.activePortfolioTemplate || "executive")
  const [previewTemplate, setPreviewTemplate] = useState(null)
  const [showPurchase, setShowPurchase] = useState(null)
  const [purchaseStatus, setPurchaseStatus] = useState("")
  const [downloading, setDownloading] = useState(false)
  const [purchasedTemplates, setPurchasedTemplates] = useState(userData?.purchasedTemplates || {})
  const pdfRef = useRef()

  const isOwned = (templateId) => {
    const t = TEMPLATES[templateId]
    return t?.tier === "free" || !!purchasedTemplates[templateId]
  }

  // Build data object from userData
  const portfolioData = {
    name: userData?.displayName || userData?.name || "Your Name",
    role: userData?.keyword || "Professional",
    email: userData?.email || "",
    eloRating: userData?.eloRating || 800,
    summary: userData?.profileSummary || "",
    skills: (userData?.skillGraph || []).filter(s => (s.label || s.skill) && (s.value || s.percentage || s.score) > 0).map(s => ({ skill: s.label || s.skill, percentage: s.value ?? s.percentage ?? s.score ?? 0 })).sort((a, b) => b.percentage - a.percentage),
    tasks: Object.entries(userData?.arenaSubmissions || {}).filter(([, sub]) => sub && typeof sub === "object" && (sub.score !== undefined)).map(([taskId, sub]) => ({ task: { id: taskId, title: sub.taskTitle || sub.title || "Arena Task", difficulty: sub.difficulty || "Medium", type: sub.type || "Task" }, submission: sub })).sort((a, b) => (b.submission?.score || 0) - (a.submission?.score || 0)),
    experiences: userData?.experiences || [],
  }

  const handleSelectTemplate = async (templateId) => {
    if (!isOwned(templateId)) {
      setShowPurchase(TEMPLATES[templateId])
      return
    }
    setSelectedTemplate(templateId)
    try {
      await userDoc.update(user.id||user.uid, { activePortfolioTemplate: templateId })
    } catch(e) {}
  }

  const handleDownloadPDF = async (templateId) => {
    setDownloading(true)
    try {
      const element = pdfRef.current
      if (!element) { setDownloading(false); return }

      // Temporarily show the element
      element.style.left = "0"
      element.style.position = "fixed"
      element.style.top = "0"
      element.style.zIndex = "9999"
      element.style.background = "#fff"

      await new Promise(r => setTimeout(r, 300))

      const canvas = await html2canvas(element.firstChild, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: 794,
        windowWidth: 794,
      })

      element.style.left = "-9999px"
      element.style.position = "absolute"
      element.style.zIndex = "-1"

      const imgData = canvas.toDataURL("image/png", 1.0)
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
      pdf.save(`${portfolioData.name.replace(/\s+/g, "_")}_Portfolio.pdf`)
    } catch(e) {
      console.error("PDF error:", e)
      alert("PDF generation failed. Please try again.")
    }
    setDownloading(false)
  }

  const handlePurchase = async (template) => {
    setPurchaseStatus("loading")
    try {
      const orderRes = await fetch(API + "/api/theme/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId: template.id, themeName: template.name, amount: template.price, uid: user.uid })
      })
      const order = await orderRes.json()
      if (!order.orderId) throw new Error(order.error || "Order failed")

      const options = {
        key: order.keyId,
        amount: order.amount * 100,
        currency: "INR",
        name: "Capabilio",
        description: `Portfolio Template: ${template.name}`,
        order_id: order.orderId,
        prefill: { email: userData?.email || "" },
        theme: { color: "#6366F1" },
        handler: async (response) => {
          const verifyRes = await fetch(API + "/api/theme/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...response, uid: user.uid, themeId: template.id })
          })
          const result = await verifyRes.json()
          if (result.success) {
            const updated = { ...purchasedTemplates, [template.id]: { purchasedAt: new Date().toISOString() } }
            setPurchasedTemplates(updated)
            setSelectedTemplate(template.id)
            setShowPurchase(null)
            setPurchaseStatus("success")
            setTimeout(() => setPurchaseStatus(""), 3000)
            try { await userDoc.update(user.id||user.uid, { purchasedTemplates: {...(await userDoc.get(user.id||user.uid))?.purchasedTemplates, [template.id]: { purchasedAt: new Date().toISOString() }}, activePortfolioTemplate: template.id }) } catch(e) {}
          }
        },
        modal: { ondismiss: () => setPurchaseStatus("") }
      }
      if (window.Razorpay) { new window.Razorpay(options).open(); setPurchaseStatus("") }
    } catch(e) { setPurchaseStatus("error"); setTimeout(() => setPurchaseStatus(""), 3000) }
  }

  const ActiveTemplateComponent = TemplateComponents[selectedTemplate] || TemplateComponents.executive
  const PreviewComponent = previewTemplate ? TemplateComponents[previewTemplate] : null

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      {/* Hidden PDF renderer */}
      <div ref={pdfRef} style={{ position: "absolute", left: "-9999px", top: 0, zIndex: -1 }}>
        <ActiveTemplateComponent data={portfolioData} />
      </div>

      {/* Main gallery modal */}
      <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, width: "100%", maxWidth: 900, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9" }}>Portfolio Templates</div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Choose a professional template. Preview uses your real data.</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {purchaseStatus === "success" && <span style={{ fontSize: 11, color: "#78FF9E", fontWeight: 700 }}>✓ Template unlocked!</span>}
            <button onClick={() => handleDownloadPDF(selectedTemplate)} disabled={downloading}
              style={{ padding: "8px 16px", background: downloading ? "rgba(0,0,0,0.03)" : "linear-gradient(135deg,#6366F1,#4f46e5)", border: "none", borderRadius: 8, color: downloading ? "#475569" : "#fff", fontSize: 12, fontWeight: 700, cursor: downloading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
              {downloading ? "⏳ Generating..." : "⬇ Download PDF"}
            </button>
            <button onClick={() => setPreviewTemplate(selectedTemplate)}
              style={{ padding: "8px 16px", background: "rgba(0,0,0,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f1f5f9", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              👁 Preview
            </button>
            <button onClick={onClose}
              style={{ width: 32, height: 32, background: "rgba(0,0,0,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#64748b", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
          {/* Template grid */}
          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            {/* Free */}
            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Free Templates</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
              {Object.values(TEMPLATES).filter(t => t.tier === "free").map(t => (
                <TemplateThumbnail key={t.id} template={t} active={selectedTemplate === t.id} owned={isOwned(t.id)}
                  onClick={() => { setSelectedTemplate(t.id); handleSelectTemplate(t.id) }} />
              ))}
            </div>
            {/* Basic */}
            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Premium Templates — ₹49</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
              {Object.values(TEMPLATES).filter(t => t.tier === "basic").map(t => (
                <TemplateThumbnail key={t.id} template={t} active={selectedTemplate === t.id} owned={isOwned(t.id)}
                  onClick={() => isOwned(t.id) ? handleSelectTemplate(t.id) : setShowPurchase(t)} />
              ))}
            </div>
            {/* Gold */}
            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Gold Templates — ₹99</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {Object.values(TEMPLATES).filter(t => t.tier === "gold").map(t => (
                <TemplateThumbnail key={t.id} template={t} active={selectedTemplate === t.id} owned={isOwned(t.id)}
                  onClick={() => isOwned(t.id) ? handleSelectTemplate(t.id) : setShowPurchase(t)} />
              ))}
            </div>
          </div>

          {/* Right: live preview of selected template */}
          <div style={{ width: 300, borderLeft: "1px solid rgba(255,255,255,0.07)", padding: 16, overflowY: "auto", background: "#080f1e", flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Preview — Your Data</div>
            <div style={{ transform: "scale(0.37)", transformOrigin: "top left", width: 794, pointerEvents: "none" }}>
              <ActiveTemplateComponent data={portfolioData} />
            </div>
          </div>
        </div>
      </div>

      {/* Full preview modal */}
      {PreviewComponent && (
        <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 20px" }}
          onClick={e => { if (e.target === e.currentTarget) setPreviewTemplate(null) }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, maxWidth: 794 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Full Preview — {TEMPLATES[previewTemplate]?.name}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { handleDownloadPDF(previewTemplate); setPreviewTemplate(null) }}
                  style={{ padding: "7px 14px", background: "linear-gradient(135deg,#6366F1,#4f46e5)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  ⬇ Download PDF
                </button>
                <button onClick={() => setPreviewTemplate(null)}
                  style={{ padding: "7px 14px", background: "rgba(0,0,0,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f1f5f9", fontSize: 12, cursor: "pointer" }}>
                  Close
                </button>
              </div>
            </div>
            <div style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.8)", borderRadius: 4, overflow: "hidden" }}>
              <PreviewComponent data={portfolioData} />
            </div>
          </div>
        </div>
      )}

      {/* Purchase modal */}
      {showPurchase && (
        <div style={{ position: "fixed", inset: 0, zIndex: 4000, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowPurchase(null); setPurchaseStatus("") } }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, width: "100%", maxWidth: 420, overflow: "hidden" }}>
            {/* Preview in purchase modal uses real data */}
            <div style={{ height: 180, overflow: "hidden", position: "relative", background: showPurchase.thumbnail?.bg || "#fff" }}>
              <div style={{ transform: "scale(0.22)", transformOrigin: "top left", width: 794, pointerEvents: "none" }}>
                {TemplateComponents[showPurchase.id] && <>{(() => { const C = TemplateComponents[showPurchase.id]; return <C data={portfolioData} /> })()}</>}
              </div>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent 60%,rgba(15,23,42,0.8))" }} />
              <div style={{ position: "absolute", bottom: 12, left: 16, fontSize: 14, fontWeight: 800, color: "#f1f5f9" }}>{showPurchase.name}</div>
            </div>
            <div style={{ padding: "20px 24px 24px" }}>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{showPurchase.description}</div>
              <div style={{ fontSize: 11, color: "#475569", marginBottom: 16, padding: "8px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,0,0,0.03)", borderRadius: 8 }}>
                Preview above shows <strong style={{ color: "#f1f5f9" }}>your actual profile data</strong>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: "#6366F1" }}>₹{showPurchase.price}</span>
                <span style={{ fontSize: 12, color: "#475569" }}>one-time · permanent · download PDF anytime</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handlePurchase(showPurchase)} disabled={purchaseStatus === "loading"}
                  style={{ flex: 1, padding: "13px", background: purchaseStatus === "loading" ? "rgba(0,0,0,0.03)" : "linear-gradient(135deg,#6366F1,#4f46e5)", border: "none", borderRadius: 10, color: purchaseStatus === "loading" ? "#475569" : "#fff", fontSize: 14, fontWeight: 800, cursor: purchaseStatus === "loading" ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                  {purchaseStatus === "loading" ? "Processing…" : `🔓 Unlock for ₹${showPurchase.price}`}
                </button>
                <button onClick={() => { setShowPurchase(null); setPurchaseStatus("") }}
                  style={{ padding: "13px 16px", background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 10, color: "#64748b", fontSize: 13, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
              {purchaseStatus === "error" && <div style={{ marginTop: 10, fontSize: 11, color: "#FF6B9D", textAlign: "center" }}>Payment failed. Try again.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
