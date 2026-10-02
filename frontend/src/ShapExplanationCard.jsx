export default function ShapExplanationCard({ shapAttributions, baseValue = 0.05, riskScore }) {
  if (!shapAttributions || shapAttributions.length === 0) return null;

  return (
    <div style={{
      background: "rgba(15, 23, 42, 0.7)",
      border: "1px solid rgba(56, 189, 248, 0.25)",
      borderRadius: 12,
      padding: 16,
      marginTop: 14
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>📊</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
            SHAP Explainable AI (TreeExplainer Attribution)
          </span>
        </div>
        <span style={{
          fontSize: 10,
          fontWeight: 800,
          color: "#38bdf8",
          background: "rgba(56, 189, 248, 0.15)",
          padding: "2px 8px",
          borderRadius: 10
        }}>
          Exact Shapley Values
        </span>
      </div>

      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.4 }}>
        Features pushing risk toward fraud (<span style={{ color: "#f43f5e", fontWeight: 700 }}>+ Crimson</span>) vs protective baseline factors (<span style={{ color: "#10b981", fontWeight: 700 }}>- Green</span>). Base risk: <strong>{(baseValue * 100).toFixed(1)}%</strong>.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {shapAttributions.map((item, idx) => {
          const val = item.shap_value || 0;
          const isPos = val >= 0;
          const absVal = Math.min(1.0, Math.abs(val));
          const barWidth = Math.max(8, absVal * 160);

          return (
            <div key={idx} style={{ fontSize: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
                  {item.display_name || item.feature}
                </span>
                <span style={{
                  color: isPos ? "#f43f5e" : "#10b981",
                  fontWeight: 800,
                  fontSize: 11
                }}>
                  {isPos ? `+${val.toFixed(3)}` : val.toFixed(3)} ({item.impact})
                </span>
              </div>

              {/* Dual-Direction SHAP Bar */}
              <div style={{
                height: 7,
                background: "rgba(0, 0, 0, 0.3)",
                borderRadius: 4,
                overflow: "hidden",
                position: "relative"
              }}>
                <div style={{
                  width: `${Math.min(100, barWidth)}%`,
                  height: "100%",
                  background: isPos ? "linear-gradient(90deg, #f43f5e, #e11d48)" : "linear-gradient(90deg, #10b981, #059669)",
                  borderRadius: 4,
                  boxShadow: isPos ? "0 0 8px rgba(244, 63, 94, 0.4)" : "0 0 8px rgba(16, 185, 129, 0.4)"
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
