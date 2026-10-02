import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API || "http://localhost:8000";

const CHANNELS = [
  { id: "WhatsApp", name: "WhatsApp", icon: "💬", color: "#25D366" },
  { id: "iMessage", name: "iMessage", icon: "💬", color: "#007AFF" },
  { id: "Telegram", name: "Telegram", icon: "✈️", color: "#229ED9" },
  { id: "Signal", name: "Signal", icon: "🔒", color: "#3A76F0" },
  { id: "Other", name: "Other", icon: "🌐", color: "#A855F7" },
];

const PRESETS = [
  {
    label: "🚨 Urgent Impersonation Scam",
    channel: "WhatsApp",
    text: "Hey, broke my phone this is my temporary number! I urgently need $8,500 right now for an emergency hospital bill. Please don't call and keep this secret, wire to this account immediately! http://bit.ly/urgent-pay",
    reason: "Emergency hospital medical bill",
    history: "Known them for a while but never transferred before",
    relationship: "family"
  },
  {
    label: "🪙 Crypto Pressure & Secrecy",
    channel: "Telegram",
    text: "URGENT opportunity: send $5,000 USDT to this wallet right now. Guaranteed 300% returns by midnight! Do not tell anyone or the slot will close. Act now before time runs out: http://bit.ly/yield-pool",
    reason: "Private investment opportunity",
    history: "Met in an online group two weeks ago",
    relationship: "other"
  },
  {
    label: "🔒 Account Lock Phishing",
    channel: "iMessage",
    text: "Your account has been temporarily suspended due to security irregularities. Send $1,200 verification deposit immediately to unlock your funds or your account will be frozen permanently.",
    reason: "Account unfreeze fee",
    history: "First time interacting",
    relationship: "other"
  },
  {
    label: "✅ Legitimate Friend Split",
    channel: "WhatsApp",
    text: "Hey Alex! Whenever you get a moment, here is the breakdown for the cabin trip deposit ($450 each). No rush at all, let me know when you sent it over!",
    reason: "Shared vacation rental deposit",
    history: "Close friend for 7 years, we travel together often",
    relationship: "friend"
  }
];

export default function App() {
  const [screen, setScreen] = useState(1);
  const [apiOnline, setApiOnline] = useState(null);

  // Transaction Inputs
  const [tx, setTx] = useState({
    recipient_name: "John Smith",
    amount: 8500,
    avg_amount_90d: 120,
    recipient_age_days: 20,
    prior_tx_with_recipient: 0,
    tx_last_24h: 0,
    hour: new Date().getHours(),
    new_device: false
  });

  // Verification Form Inputs
  const [f, setF] = useState({
    name: "John Smith",
    age: "28",
    location: "Chicago, IL",
    phone: "+1 312 555 0192",
    relationship: "friend",
    how_do_you_know: "Met at college, been friends for years",
    history: "Known each other for 4 years, split dinner bills occasionally",
    reason: "Emergency support for car repairs",
    communication_channel: "WhatsApp",
    communication_text: ""
  });

  // State
  const [res, setRes] = useState(null);
  const [commAnalysis, setCommAnalysis] = useState(null);
  const [analyzingComm, setAnalyzingComm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showRawTrace, setShowRawTrace] = useState(false);

  // Check backend health
  useEffect(() => {
    fetch(`${API}/health`)
      .then((r) => r.json())
      .then((d) => setApiOnline(d.status === "ok"))
      .catch(() => setApiOnline(false));
  }, []);

  const post = async (endpoint, body) => {
    const res = await fetch(`${API}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errText = await res.text();
      let msg = errText;
      try {
        const parsed = JSON.parse(errText);
        msg = parsed.detail || errText;
      } catch {}
      throw new Error(msg);
    }
    return res.json();
  };

  // Stage 1 Send
  const handleSend = async () => {
    setBusy(true);
    setErr("");
    try {
      const data = await post("/api/transactions/assess", {
        user_id: "U-8821",
        recipient_name: tx.recipient_name,
        amount: Number(tx.amount),
        avg_amount_90d: Number(tx.avg_amount_90d),
        recipient_age_days: Number(tx.recipient_age_days),
        prior_tx_with_recipient: Number(tx.prior_tx_with_recipient),
        tx_last_24h: Number(tx.tx_last_24h),
        hour: Number(tx.hour),
        new_device: Boolean(tx.new_device)
      });
      setRes(data);
      if (data.decision === "REQUIRE_VERIFICATION") {
        setScreen(2);
      } else {
        setScreen(4);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Real-time Communication Analysis
  const handleAnalyzeCommunication = async () => {
    if (!f.communication_text.trim()) {
      setErr("Please enter message details or an excerpt before analyzing.");
      return;
    }
    setAnalyzingComm(true);
    setErr("");
    try {
      const analysis = await post("/api/communication/analyze", {
        channel: f.communication_channel,
        description: f.communication_text,
        relationship: f.relationship,
        reason: f.reason
      });
      setCommAnalysis(analysis);
    } catch (e) {
      setErr("Analysis failed: " + e.message);
    } finally {
      setAnalyzingComm(false);
    }
  };

  // Stage 2 Verification Submit
  const handleVerify = async () => {
    setBusy(true);
    setErr("");
    try {
      const data = await post(`/api/transactions/${res.transaction_id}/verify`, {
        name: f.name,
        age: Number(f.age),
        location: f.location,
        phone: f.phone,
        relationship: f.relationship,
        how_do_you_know: f.how_do_you_know,
        history: f.history,
        reason: f.reason,
        communication_channel: f.communication_channel,
        communication_text: f.communication_text.trim() ? f.communication_text : null,
        phone_in_user_contacts: false
      });
      setRes(data);
      setScreen(4);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const applyPreset = (preset) => {
    setF({
      ...f,
      communication_channel: preset.channel,
      communication_text: preset.text,
      reason: preset.reason,
      history: preset.history,
      relationship: preset.relationship
    });
    setCommAnalysis(null);
  };

  // Color helpers
  const getDecisionBadge = (decision) => {
    switch (decision) {
      case "APPROVE":
        return { bg: "rgba(16, 185, 129, 0.15)", border: "#10b981", color: "#34d399", label: "APPROVE", icon: "✓" };
      case "REQUIRE_VERIFICATION":
        return { bg: "rgba(245, 158, 11, 0.15)", border: "#f59e0b", color: "#fbbf24", label: "REQUIRE VERIFICATION", icon: "⚠️" };
      case "HOLD":
        return { bg: "rgba(239, 68, 68, 0.15)", border: "#ef4444", color: "#f87171", label: "HOLD FOR REVIEW", icon: "✋" };
      case "BLOCK":
        return { bg: "rgba(225, 29, 72, 0.2)", border: "#e11d48", color: "#fb7185", label: "TRANSACTION BLOCKED", icon: "🛑" };
      default:
        return { bg: "rgba(100, 116, 139, 0.2)", border: "#64748b", color: "#94a3b8", label: decision, icon: "ℹ️" };
    }
  };

  const getScoreColor = (score) => {
    if (score < 0.35) return "#10b981";
    if (score < 0.70) return "#f59e0b";
    return "#f43f5e";
  };

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "32px 20px 80px" }}>
      {/* Top Navbar */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 24,
        borderBottom: "1px solid var(--border-subtle)",
        marginBottom: 32
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "linear-gradient(135deg, #6366f1, #38bdf8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)"
          }}>
            🛡️
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Agentic Risk Shield
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Two-Stage Protection & Social Communication Forensics
            </p>
          </div>
        </div>

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(255, 255, 255, 0.04)",
          padding: "6px 14px",
          borderRadius: 20,
          border: "1px solid var(--border-subtle)",
          fontSize: 12
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: apiOnline ? "#10b981" : "#ef4444",
            boxShadow: apiOnline ? "0 0 8px #10b981" : "none"
          }} />
          <span style={{ color: "var(--text-muted)" }}>
            Engine: {apiOnline === null ? "Connecting..." : apiOnline ? "Online (Port 8000)" : "Offline"}
          </span>
        </div>
      </header>

      {/* Stepper Progress */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 8,
        marginBottom: 32
      }}>
        {[
          { num: 1, label: "Transfer Setup" },
          { num: 2, label: "Risk Alert" },
          { num: 3, label: "Social Verification" },
          { num: 4, label: "Multi-Agent Verdict" }
        ].map((s) => {
          const active = screen === s.num;
          const completed = screen > s.num;
          return (
            <div key={s.num} style={{
              background: active ? "rgba(99, 102, 241, 0.15)" : "rgba(255, 255, 255, 0.02)",
              border: `1px solid ${active ? "var(--primary)" : completed ? "rgba(16, 185, 129, 0.3)" : "var(--border-subtle)"}`,
              borderRadius: "var(--radius-md)",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              transition: "all 0.2s"
            }}>
              <span style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: completed ? "var(--accent-emerald)" : active ? "var(--primary)" : "rgba(255, 255, 255, 0.1)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                {completed ? "✓" : s.num}
              </span>
              <span style={{
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                color: active ? "#fff" : completed ? "var(--text-muted)" : "var(--text-faint)"
              }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error Alert */}
      {err && (
        <div style={{
          background: "rgba(239, 68, 68, 0.12)",
          border: "1px solid rgba(239, 68, 68, 0.4)",
          borderRadius: "var(--radius-md)",
          padding: "12px 18px",
          color: "#fca5a5",
          fontSize: 14,
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>⚠️ {err}</span>
          <button
            onClick={() => setErr("")}
            style={{ background: "transparent", border: 0, color: "#fca5a5", cursor: "pointer", fontSize: 16 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* =========================================================================
          SCREEN 1: TRANSACTION INITIATION
         ========================================================================= */}
      {screen === 1 && (
        <div className="animate-fade-in" style={{
          background: "var(--bg-card)",
          backdropFilter: "var(--glass-blur)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: 32,
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
        }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
              Initiate Bank Transfer
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              Stage 1 ML will perform sub-millisecond behavioral analysis before any user friction is applied.
            </p>
          </div>

          {/* Quick Scenario Fillers */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Quick Scenario Presets:
            </label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setTx({ ...tx, recipient_name: "John Smith", amount: 8500, avg_amount_90d: 120, recipient_age_days: 20, prior_tx_with_recipient: 0 })}
                style={{
                  background: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "#fbbf24",
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  cursor: "pointer"
                }}
              >
                ⚠️ High Risk / Verification Needed ($8,500)
              </button>
              <button
                type="button"
                onClick={() => setTx({ ...tx, recipient_name: "Sarah Miller", amount: 75, avg_amount_90d: 90, recipient_age_days: 900, prior_tx_with_recipient: 12 })}
                style={{
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#34d399",
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  cursor: "pointer"
                }}
              >
                ✓ Low Risk / Auto-Approve ($75)
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                Recipient Name
              </label>
              <input
                type="text"
                value={tx.recipient_name}
                onChange={(e) => setTx({ ...tx, recipient_name: e.target.value })}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  background: "rgba(0, 0, 0, 0.3)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "#fff",
                  fontSize: 15
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                Transfer Amount ($ USD)
              </label>
              <input
                type="number"
                value={tx.amount}
                onChange={(e) => setTx({ ...tx, amount: e.target.value })}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  background: "rgba(0, 0, 0, 0.3)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "#fff",
                  fontSize: 15
                }}
              />
            </div>
          </div>

          {/* Context details */}
          <details style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "14px 18px",
            marginBottom: 24
          }}>
            <summary style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", cursor: "pointer" }}>
              ⚙️ Environmental & Velocity Signals (normally from bank stream)
            </summary>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-faint)", display: "block", marginBottom: 4 }}>
                  90-Day Avg Transfer
                </label>
                <input
                  type="number"
                  value={tx.avg_amount_90d}
                  onChange={(e) => setTx({ ...tx, avg_amount_90d: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 6,
                    color: "#fff",
                    fontSize: 13
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-faint)", display: "block", marginBottom: 4 }}>
                  Recipient Account Age (Days)
                </label>
                <input
                  type="number"
                  value={tx.recipient_age_days}
                  onChange={(e) => setTx({ ...tx, recipient_age_days: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 6,
                    color: "#fff",
                    fontSize: 13
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-faint)", display: "block", marginBottom: 4 }}>
                  Prior Transfers to Recipient
                </label>
                <input
                  type="number"
                  value={tx.prior_tx_with_recipient}
                  onChange={(e) => setTx({ ...tx, prior_tx_with_recipient: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 6,
                    color: "#fff",
                    fontSize: 13
                  }}
                />
              </div>
            </div>
          </details>

          <button
            onClick={handleSend}
            disabled={busy}
            style={{
              width: "100%",
              padding: "14px 20px",
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              color: "#fff",
              border: 0,
              borderRadius: "var(--radius-md)",
              fontSize: 15,
              fontWeight: 600,
              cursor: busy ? "not-allowed" : "pointer",
              boxShadow: "0 4px 20px rgba(99, 102, 241, 0.4)",
              transition: "transform 0.1s ease"
            }}
          >
            {busy ? "Evaluating ML Risk Model…" : "SEND TRANSFER"}
          </button>
        </div>
      )}

      {/* =========================================================================
          SCREEN 2: INTERVENTION TRIGGER ("I WANT TO PAY")
         ========================================================================= */}
      {screen === 2 && res && (
        <div className="animate-fade-in" style={{
          background: "var(--bg-card)",
          backdropFilter: "var(--glass-blur)",
          border: "1px solid rgba(245, 158, 11, 0.4)",
          borderRadius: "var(--radius-lg)",
          padding: 36,
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          textAlign: "center"
        }}>
          <div className="pulse-warning" style={{
            width: 68,
            height: 68,
            borderRadius: "50%",
            background: "rgba(245, 158, 11, 0.15)",
            border: "2px solid #f59e0b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            margin: "0 auto 20px"
          }}>
            ⚠️
          </div>

          <span style={{
            display: "inline-block",
            background: "rgba(245, 158, 11, 0.2)",
            color: "#fbbf24",
            padding: "4px 12px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.5,
            marginBottom: 12
          }}>
            SECURITY INTERVENTION REQUIRED
          </span>

          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 10 }}>
            Transaction Needs Verification
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: 15, maxWidth: 540, margin: "0 auto 24px" }}>
            This transfer was identified as elevated risk (initial score: <strong style={{ color: "#fbbf24" }}>{(res.risk_score * 100).toFixed(1)}%</strong>).
            To protect your account against impersonation and urgent payment scams, additional verification is required.
          </p>

          {/* Risk Factors Box */}
          {res.reasons && res.reasons.length > 0 && (
            <div style={{
              background: "rgba(0, 0, 0, 0.35)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "16px 20px",
              textAlign: "left",
              maxWidth: 540,
              margin: "0 auto 28px"
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 8 }}>
                Detected Anomaly Signals:
              </div>
              <ul style={{ paddingLeft: 18, color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6 }}>
                {res.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "center", gap: 14, maxWidth: 540, margin: "0 auto" }}>
            <button
              onClick={() => { setScreen(1); setRes(null); }}
              style={{
                flex: 1,
                padding: "14px 20px",
                background: "rgba(255, 255, 255, 0.05)",
                color: "var(--text-muted)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Cancel Transfer
            </button>
            <button
              onClick={() => setScreen(3)}
              style={{
                flex: 1.5,
                padding: "14px 24px",
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                color: "#000",
                border: 0,
                borderRadius: "var(--radius-md)",
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: 0.5,
                cursor: "pointer",
                boxShadow: "0 0 25px rgba(245, 158, 11, 0.5)"
              }}
            >
              I WANT TO PAY →
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN 3: RECIPIENT VERIFICATION & COMMUNICATION EVIDENCE
         ========================================================================= */}
      {screen === 3 && (
        <div className="animate-fade-in" style={{
          background: "var(--bg-card)",
          backdropFilter: "var(--glass-blur)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: 32,
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
        }}>
          <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid var(--border-subtle)" }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
              Recipient Verification Form
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
              Please provide recipient details and optional social communication context.
              Per <strong>POLICY-008</strong>, communication data is only analyzed when you explicitly share it.
            </p>
          </div>

          {/* Form Fields Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Recipient Full Name *
              </label>
              <input
                type="text"
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "#fff",
                  fontSize: 14
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Recipient Age *
              </label>
              <input
                type="number"
                value={f.age}
                onChange={(e) => setF({ ...f, age: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "#fff",
                  fontSize: 14
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Recipient Location (City, State / Country) *
              </label>
              <input
                type="text"
                value={f.location}
                onChange={(e) => setF({ ...f, location: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "#fff",
                  fontSize: 14
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Phone Number *
              </label>
              <input
                type="text"
                value={f.phone}
                onChange={(e) => setF({ ...f, phone: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "#fff",
                  fontSize: 14
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Relationship *
              </label>
              <select
                value={f.relationship}
                onChange={(e) => setF({ ...f, relationship: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "#12192c",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "#fff",
                  fontSize: 14
                }}
              >
                <option value="friend">Friend</option>
                <option value="family">Family Member</option>
                <option value="business">Business / Contractor</option>
                <option value="other">Other / New Contact</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                How do you know this person? *
              </label>
              <input
                type="text"
                value={f.how_do_you_know}
                onChange={(e) => setF({ ...f, how_do_you_know: e.target.value })}
                placeholder="e.g. Worked together for 3 years"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "#fff",
                  fontSize: 14
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Relationship & Transaction History *
              </label>
              <textarea
                rows={2}
                value={f.history}
                onChange={(e) => setF({ ...f, history: e.target.value })}
                placeholder="Describe your prior interaction history with this person"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "#fff",
                  fontSize: 14
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Stated Payment Reason *
              </label>
              <textarea
                rows={2}
                value={f.reason}
                onChange={(e) => setF({ ...f, reason: e.target.value })}
                placeholder="What is the purpose of this payment?"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "#fff",
                  fontSize: 14
                }}
              />
            </div>
          </div>

          {/* =========================================================================
              COMMUNICATION EVIDENCE SECTION
             ========================================================================= */}
          <div style={{
            background: "rgba(99, 102, 241, 0.05)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            borderRadius: "var(--radius-md)",
            padding: 24,
            marginBottom: 28
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>💬</span> Communication Evidence (Social Media & Messaging)
                </h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Which communication channel did you use, and what did the person tell you?
                </p>
              </div>
              <span style={{
                background: "rgba(99, 102, 241, 0.2)",
                color: "#a5b4fc",
                padding: "3px 10px",
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 600
              }}>
                POLICY-008 Compliant
              </span>
            </div>

            {/* Channel Selector */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--text-faint)" }}>
                SELECT COMMUNICATION CHANNEL:
              </label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {CHANNELS.map((ch) => {
                  const selected = f.communication_channel === ch.id;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => {
                        setF({ ...f, communication_channel: ch.id });
                        setCommAnalysis(null);
                      }}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 20,
                        border: `1px solid ${selected ? ch.color : "var(--border-subtle)"}`,
                        background: selected ? `rgba(${ch.id === "WhatsApp" ? "37, 211, 102" : "99, 102, 241"}, 0.2)` : "rgba(0,0,0,0.3)",
                        color: selected ? "#fff" : "var(--text-muted)",
                        fontSize: 13,
                        fontWeight: selected ? 700 : 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: selected ? `0 0 12px ${ch.color}40` : "none",
                        transition: "all 0.15s"
                      }}
                    >
                      <span>{ch.icon}</span>
                      <span>{ch.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Test Presets */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-faint)", marginBottom: 6 }}>
                LOAD RESEARCH TEST CASE EXCERPTS:
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(p)}
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-muted)",
                      padding: "5px 12px",
                      borderRadius: 14,
                      fontSize: 12,
                      cursor: "pointer"
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Excerpt Input */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Describe what the person told you or paste a conversation excerpt:
              </label>
              <textarea
                rows={3}
                value={f.communication_text}
                onChange={(e) => {
                  setF({ ...f, communication_text: e.target.value });
                  setCommAnalysis(null);
                }}
                placeholder='Example: "They said they urgently need $2,000 because their account is locked, please wire immediately and do not tell anyone..."'
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "#fff",
                  fontSize: 14,
                  lineHeight: 1.5
                }}
              />
            </div>

            {/* Analyze Communication Button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
                {f.communication_text.length} characters entered
              </span>
              <button
                type="button"
                onClick={handleAnalyzeCommunication}
                disabled={analyzingComm || !f.communication_text.trim()}
                style={{
                  padding: "8px 18px",
                  background: f.communication_text.trim() ? "rgba(99, 102, 241, 0.3)" : "rgba(255,255,255,0.05)",
                  border: "1px solid var(--border-glow)",
                  color: f.communication_text.trim() ? "#a5b4fc" : "var(--text-faint)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: (analyzingComm || !f.communication_text.trim()) ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <span>⚡</span>
                <span>{analyzingComm ? "Analyzing Message Forensics…" : "Analyze Communication"}</span>
              </button>
            </div>

            {/* Real-time Communication Evidence Preview Card */}
            {commAnalysis && (
              <div style={{
                marginTop: 18,
                background: "rgba(0, 0, 0, 0.45)",
                border: `1px solid ${getScoreColor(commAnalysis.evidence_strength || commAnalysis.communication_risk)}60`,
                borderRadius: "var(--radius-md)",
                padding: 16
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>
                      Communication Agent Analysis ({commAnalysis.channel}):
                    </span>
                    <span style={{
                      background: `${getScoreColor(commAnalysis.evidence_strength || commAnalysis.communication_risk)}25`,
                      color: getScoreColor(commAnalysis.evidence_strength || commAnalysis.communication_risk),
                      padding: "2px 10px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 700
                    }}>
                      Signal Strength: {((commAnalysis.evidence_strength ?? commAnalysis.communication_risk) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Urgency: <strong>{((commAnalysis.signals?.urgency ?? commAnalysis.urgency_score ?? 0) * 100).toFixed(0)}%</strong>
                  </div>
                </div>

                {/* Structured Signals Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 12 }}>
                  {[
                    { label: "Urgency", active: (commAnalysis.signals?.urgency ?? commAnalysis.urgency_score ?? 0) > 0, icon: "🚨" },
                    { label: "Payment Solicitation", active: commAnalysis.signals?.payment_request ?? commAnalysis.payment_request_detected, icon: "💳" },
                    { label: "Impersonation", active: commAnalysis.signals?.impersonation ?? commAnalysis.impersonation_indicator, icon: "🎭" },
                    { label: "Secrecy Instruction", active: commAnalysis.signals?.secrecy ?? commAnalysis.pressure_indicator, icon: "🤫" },
                    { label: "Call Discouraged", active: commAnalysis.signals?.verification_discouragement, icon: "📵" },
                    { label: "Suspicious URL", active: commAnalysis.signals?.suspicious_url ?? commAnalysis.suspicious_link_detected, icon: "🔗" }
                  ].map((sig, i) => (
                    <div key={i} style={{
                      background: sig.active ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 255, 255, 0.03)",
                      border: `1px solid ${sig.active ? "rgba(239, 68, 68, 0.4)" : "var(--border-subtle)"}`,
                      padding: "6px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      color: sig.active ? "#f87171" : "var(--text-faint)"
                    }}>
                      <span>{sig.icon}</span>
                      <span style={{ fontWeight: sig.active ? 600 : 400 }}>{sig.label}</span>
                    </div>
                  ))}
                </div>

                {/* Evidence items */}
                {commAnalysis.evidence && commAnalysis.evidence.length > 0 && (
                  <ul style={{ paddingLeft: 16, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                    {commAnalysis.evidence.map((ev, idx) => (
                      <li key={idx}>{ev}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Verification Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={() => setScreen(2)}
              style={{
                padding: "12px 20px",
                background: "rgba(255, 255, 255, 0.05)",
                color: "var(--text-muted)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                fontSize: 14,
                cursor: "pointer"
              }}
            >
              ← Back
            </button>
            <button
              onClick={handleVerify}
              disabled={busy}
              style={{
                padding: "14px 28px",
                background: "linear-gradient(135deg, #6366f1, #38bdf8)",
                color: "#fff",
                border: 0,
                borderRadius: "var(--radius-md)",
                fontSize: 15,
                fontWeight: 700,
                cursor: busy ? "not-allowed" : "pointer",
                boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)"
              }}
            >
              {busy ? "Running Multi-Agent Audit…" : "SUBMIT VERIFICATION & RUN AUDIT"}
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN 4: FINAL MULTI-AGENT VERDICT & RISK DECOMPOSITION
         ========================================================================= */}
      {screen === 4 && res && (
        <div className="animate-fade-in" style={{
          background: "var(--bg-card)",
          backdropFilter: "var(--glass-blur)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: 36,
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
        }}>
          {/* Decision Banner */}
          {(() => {
            const badge = getDecisionBadge(res.decision);
            return (
              <div style={{
                background: badge.bg,
                border: `1px solid ${badge.border}`,
                borderRadius: "var(--radius-md)",
                padding: "20px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: badge.border,
                    color: "#000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    fontWeight: 900
                  }}>
                    {badge.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: badge.color, textTransform: "uppercase" }}>
                      Stage {res.stage} Orchestrated Verdict
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "2px 0 0" }}>
                      {badge.label}
                    </h2>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase" }}>
                    Final Combined Risk
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: getScoreColor(res.risk_score), fontFamily: "var(--font-mono)" }}>
                    {(res.risk_score * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Research Architecture Flow Visualizer (Directly matching user diagram) */}
          <div style={{
            background: "rgba(0, 0, 0, 0.4)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: 20,
            marginBottom: 24
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-blue)", letterSpacing: 0.5, textTransform: "uppercase" }}>
                ⚡ STAGE 2 MULTI-AGENT ARCHITECTURE
              </div>
              <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
                Independent Signal Calibration
              </span>
            </div>

            {/* Stage 2 Parallel Agents */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Transaction Agent</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: getScoreColor(res.risk_breakdown?.transaction_risk || res.risk_score), fontFamily: "var(--font-mono)", marginTop: 2 }}>
                  {((res.risk_breakdown?.transaction_risk ?? res.risk_score) * 100).toFixed(1)}%
                </div>
              </div>

              <div style={{ background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.3)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#a5b4fc" }}>Communication Agent</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: getScoreColor(res.risk_breakdown?.communication_signal_strength ?? res.risk_breakdown?.communication_risk ?? 0), fontFamily: "var(--font-mono)", marginTop: 2 }}>
                  {(((res.risk_breakdown?.communication_signal_strength ?? res.risk_breakdown?.communication_risk) || 0) * 100).toFixed(0)}%
                </div>
                <div style={{ fontSize: 9, color: "var(--text-faint)", marginTop: 2 }}>Signal Strength</div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Relationship Agent</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: getScoreColor(res.risk_breakdown?.relationship_risk || 0.2), fontFamily: "var(--font-mono)", marginTop: 2 }}>
                  {((res.risk_breakdown?.relationship_risk ?? 0.2) * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* History Agent & Orchestrator Flow */}
            <div style={{ textAlign: "center", margin: "8px 0" }}>
              <span style={{ color: "var(--text-faint)", fontSize: 12 }}>↓</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "center" }}>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>History Agent Signal:</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: getScoreColor(res.risk_breakdown?.history_risk || 0.35), fontFamily: "var(--font-mono)" }}>
                  {((res.risk_breakdown?.history_risk ?? 0.35) * 100).toFixed(0)}%
                </span>
              </div>

              <div style={{ background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#7dd3fc" }}>Agent Orchestrator:</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  XGBoost + RAG + XAI
                </span>
              </div>
            </div>
          </div>

          {/* =========================================================================
              🔍 RESEARCH-QUALITY AGENT AUDIT TRACE
             ========================================================================= */}
          <div style={{
            background: "rgba(0, 0, 0, 0.35)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: 24,
            marginBottom: 24
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                <span>🔍</span> Agent Audit Trace
              </h3>
              <button
                type="button"
                onClick={() => setShowRawTrace(!showRawTrace)}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-muted)",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  cursor: "pointer"
                }}
              >
                {showRawTrace ? "Hide Raw JSON" : "View Raw JSON"}
              </button>
            </div>

            {/* Structured Trace Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {res.trace && res.trace.map((item, idx) => {
                const agentIcons = {
                  "Transaction Agent": "💳",
                  "Communication Agent": "💬",
                  "Relationship Agent": "👥",
                  "Risk Agent": "⚡",
                  "Risk Agent (XGBoost Stage 1)": "⚡",
                  "Risk Agent (XGBoost Stage 2)": "⚡",
                  "RAG Policy Agent": "📚",
                  "Decision Agent": "🎯"
                };
                const icon = agentIcons[item.agent] || "🤖";
                return (
                  <div key={idx} style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12
                  }}>
                    <span style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: "rgba(255, 255, 255, 0.05)",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      {item.step || idx + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
                        <span>{icon}</span>
                        <span>{item.agent || item.action}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--accent-blue)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                        → {item.summary || JSON.stringify(item.observation)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {showRawTrace && (
              <div style={{
                marginTop: 14,
                background: "#080c14",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: 14,
                maxHeight: 220,
                overflowY: "auto",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "#93c5fd"
              }}>
                <pre>{JSON.stringify(res.trace, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* Structured Social Communication Evidence Signals */}
          {res.communication_evidence && (
            <div style={{
              background: "rgba(37, 211, 102, 0.05)",
              border: "1px solid rgba(37, 211, 102, 0.25)",
              borderRadius: "var(--radius-md)",
              padding: 20,
              marginBottom: 24
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: "#34d399", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>💬</span> Social Communication Forensics ({res.communication_evidence.channel})
                </h4>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Signal Strength: {(((res.communication_evidence.evidence_strength ?? res.communication_evidence.communication_risk) || 0) * 100).toFixed(0)}%
                </span>
              </div>

              {/* Signals Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, marginBottom: 12 }}>
                {[
                  { label: "Urgency", active: (res.communication_evidence.signals?.urgency ?? res.communication_evidence.urgency_score ?? 0) > 0 },
                  { label: "Payment Solicitation", active: res.communication_evidence.signals?.payment_request ?? res.communication_evidence.payment_request_detected },
                  { label: "Impersonation", active: res.communication_evidence.signals?.impersonation ?? res.communication_evidence.impersonation_indicator },
                  { label: "Secrecy Instruction", active: res.communication_evidence.signals?.secrecy ?? res.communication_evidence.pressure_indicator },
                  { label: "Call Discouraged", active: res.communication_evidence.signals?.verification_discouragement },
                  { label: "Suspicious URL", active: res.communication_evidence.signals?.suspicious_url ?? res.communication_evidence.suspicious_link_detected }
                ].map((s, idx) => (
                  <div key={idx} style={{
                    background: s.active ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 255, 255, 0.03)",
                    border: `1px solid ${s.active ? "rgba(239, 68, 68, 0.35)" : "var(--border-subtle)"}`,
                    padding: "6px 8px",
                    borderRadius: 6,
                    fontSize: 11,
                    color: s.active ? "#f87171" : "var(--text-faint)",
                    fontWeight: s.active ? 600 : 400
                  }}>
                    {s.active ? "🚨" : "✓"} {s.label}
                  </div>
                ))}
              </div>

              {res.communication_evidence.evidence && res.communication_evidence.evidence.length > 0 && (
                <ul style={{ paddingLeft: 18, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                  {res.communication_evidence.evidence.map((ev, idx) => (
                    <li key={idx}>{ev}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Explainable AI Notice (Clean, research-defensible format) */}
          <div style={{
            background: "rgba(0, 0, 0, 0.3)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: 22,
            marginBottom: 28
          }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 12 }}>
              🛡️ Customer Risk Assessment Notice (XAI Grounded)
            </h4>
            <div style={{
              fontSize: 13.5,
              color: "var(--text-muted)",
              lineHeight: 1.8,
              whiteSpace: "pre-wrap",
              background: "rgba(0,0,0,0.25)",
              padding: 16,
              borderRadius: 8,
              border: "1px solid var(--border-subtle)",
              fontFamily: "var(--font-sans)"
            }}>
              {res.message}
            </div>
          </div>

          {/* Reset / New Transfer */}
          <button
            onClick={() => {
              setScreen(1);
              setRes(null);
              setCommAnalysis(null);
              setF({ ...f, communication_text: "" });
            }}
            style={{
              width: "100%",
              padding: "14px 20px",
              background: "rgba(255, 255, 255, 0.08)",
              color: "#fff",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            ← Test Another Transfer Scenario
          </button>
        </div>
      )}
    </div>
  );
}
