import { useState, useEffect } from "react";
import AuthPortal from "./AuthPortal";

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

const formatUSD = (val) => {
  const num = Number(val || 0);
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const THEMES = {
  ribbon: {
    id: "ribbon",
    label: "🔴🔵 Royal & Crimson",
    boxBg: "linear-gradient(135deg, rgba(10, 25, 47, 0.94) 0%, rgba(26, 54, 110, 0.88) 35%, rgba(136, 19, 55, 0.72) 75%, rgba(15, 23, 42, 0.96) 100%)",
    border: "1.5px solid rgba(56, 189, 248, 0.55)",
    boxShadow: "0 25px 65px rgba(0, 0, 0, 0.7), 0 0 50px rgba(37, 99, 235, 0.45), 0 0 90px rgba(225, 29, 72, 0.28)",
    topRibbon: "linear-gradient(90deg, #1d4ed8 0%, #38bdf8 30%, #f43f5e 70%, #e11d48 100%)",
    navBg: "linear-gradient(90deg, rgba(30, 58, 138, 0.7) 0%, rgba(190, 18, 60, 0.45) 100%)",
    balanceBg: "linear-gradient(135deg, rgba(30, 64, 175, 0.6) 0%, rgba(15, 23, 42, 0.85) 55%, rgba(159, 18, 57, 0.45) 100%)",
    balanceBorder: "1px solid rgba(56, 189, 248, 0.5)",
    primaryBtn: "linear-gradient(135deg, #0284c7 0%, #2563eb 45%, #e11d48 100%)",
    primaryBtnGlow: "0 0 25px rgba(37, 99, 235, 0.55)"
  },
  cyber: {
    id: "cyber",
    label: "🟣 Cyber Indigo",
    boxBg: "linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(67, 56, 202, 0.84) 45%, rgba(147, 51, 234, 0.72) 80%, rgba(15, 23, 42, 0.96) 100%)",
    border: "1.5px solid rgba(168, 85, 247, 0.55)",
    boxShadow: "0 25px 65px rgba(0, 0, 0, 0.7), 0 0 50px rgba(99, 102, 241, 0.5), 0 0 90px rgba(168, 85, 247, 0.35)",
    topRibbon: "linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)",
    navBg: "linear-gradient(90deg, rgba(67, 56, 202, 0.7) 0%, rgba(147, 51, 234, 0.45) 100%)",
    balanceBg: "linear-gradient(135deg, rgba(67, 56, 202, 0.55) 0%, rgba(15, 23, 42, 0.85) 60%, rgba(147, 51, 234, 0.45) 100%)",
    balanceBorder: "1px solid rgba(168, 85, 247, 0.5)",
    primaryBtn: "linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)",
    primaryBtnGlow: "0 0 25px rgba(168, 85, 247, 0.55)"
  },
  emerald: {
    id: "emerald",
    label: "🟢 Emerald & Gold",
    boxBg: "linear-gradient(135deg, rgba(6, 78, 59, 0.94) 0%, rgba(15, 23, 42, 0.94) 50%, rgba(120, 53, 15, 0.8) 100%)",
    border: "1.5px solid rgba(52, 211, 153, 0.55)",
    boxShadow: "0 25px 65px rgba(0, 0, 0, 0.7), 0 0 50px rgba(16, 185, 129, 0.45), 0 0 90px rgba(245, 158, 11, 0.3)",
    topRibbon: "linear-gradient(90deg, #059669 0%, #10b981 40%, #f59e0b 100%)",
    navBg: "linear-gradient(90deg, rgba(6, 78, 59, 0.7) 0%, rgba(120, 53, 15, 0.45) 100%)",
    balanceBg: "linear-gradient(135deg, rgba(6, 78, 59, 0.6) 0%, rgba(15, 23, 42, 0.85) 60%, rgba(120, 53, 15, 0.45) 100%)",
    balanceBorder: "1px solid rgba(52, 211, 153, 0.5)",
    primaryBtn: "linear-gradient(135deg, #059669 0%, #10b981 50%, #f59e0b 100%)",
    primaryBtnGlow: "0 0 25px rgba(16, 185, 129, 0.55)"
  }
};

export default function App() {
  // Navigation: "customer" (banking portal view) vs "manager" (bank operations console)
  const [activePortal, setActivePortal] = useState("customer");
  const [boxTheme, setBoxTheme] = useState("ribbon");
  const currentTheme = THEMES[boxTheme] || THEMES.ribbon;

  // Authentication State (Bank of America Style & Face ID)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("risk_shield_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("risk_shield_user");
    setCustStep(1);
    setRes(null);
  };

  useEffect(() => {
    if (currentUser) {
      setTx((prev) => ({
        ...prev,
        customer_name: currentUser.full_name
      }));
    }
  }, [currentUser]);

  // Customer app step:
  // 1: Search Recipient by Phone/Email
  // 2: Recipient Found Verification Card
  // 3: Enter Amount & Purpose
  // 4: Risk Alert (Needs Review / I WANT TO PAY)
  // 5: Recipient & Social Verification Form (Stage 2)
  // 6: Final Customer Outcome (Approved / Stopped / On Hold)
  const [custStep, setCustStep] = useState(1);

  // System & API state
  const [apiOnline, setApiOnline] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Recipient Directory search
  const [searchQuery, setSearchQuery] = useState("+1 (214) 555-0192");
  const [searchMode, setSearchMode] = useState("phone"); // "phone" | "email"
  const [foundRecipient, setFoundRecipient] = useState(null);
  const [searching, setSearching] = useState(false);

  // Transfer Transaction Details
  const [tx, setTx] = useState({
    customer_name: "Harshit P.",
    amount: 8500,
    memo: "Urgent family assistance",
    avg_amount_90d: 120,
    recipient_age_days: 20,
    prior_tx_with_recipient: 0,
    tx_last_24h: 0,
    hour: new Date().getHours(),
    new_device: false
  });

  // Stage 1 & Stage 2 API result
  const [res, setRes] = useState(null);

  // Stage 2 Verification Form Inputs
  const [vf, setVf] = useState({
    name: "John Michael Smith",
    age: "28",
    location: "Dallas, Texas",
    phone: "+1 214 555 0192",
    relationship: "friend",
    how_do_you_know: "Met online 3 weeks ago",
    history: "First time transferring money to this person",
    reason: "Urgent emergency medical assistance",
    communication_channel: "WhatsApp",
    communication_text: ""
  });

  // Communication Forensic Analysis Preview
  const [commAnalysis, setCommAnalysis] = useState(null);
  const [analyzingComm, setAnalyzingComm] = useState(false);

  // Manager Portal Queue State
  const [managerQueue, setManagerQueue] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [managerNotes, setManagerNotes] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  // Periodic health & Manager queue check
  useEffect(() => {
    const check = () => {
      fetch(`${API}/health`)
        .then((r) => r.json())
        .then((d) => setApiOnline(d.status === "ok"))
        .catch(() => setApiOnline(false));

      fetch(`${API}/api/manager/queue`)
        .then((r) => r.json())
        .then((data) => {
          setManagerQueue(data);
          if (!selectedCase && data.length > 0) {
            setSelectedCase(data[0]);
          } else if (selectedCase) {
            const updated = data.find((c) => c.transaction_id === selectedCase.transaction_id);
            if (updated) setSelectedCase(updated);
          }
        })
        .catch(() => {});
    };

    check();
    const interval = setInterval(check, 3000);
    return () => clearInterval(interval);
  }, [selectedCase]);

  // Live tracker for customer screen when on HOLD
  useEffect(() => {
    if (res && res.transaction_id && res.status === "ON_HOLD") {
      const poll = setInterval(async () => {
        try {
          const r = await fetch(`${API}/api/transactions/${res.transaction_id}`);
          if (r.ok) {
            const updated = await r.json();
            if (updated.status !== "ON_HOLD") {
              setRes(updated);
            }
          }
        } catch {}
      }, 2000);
      return () => clearInterval(poll);
    }
  }, [res]);

  // HTTP post helper
  const post = async (endpoint, body) => {
    const r = await fetch(`${API}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const errText = await r.text();
      let msg = errText;
      try {
        const parsed = JSON.parse(errText);
        msg = parsed.detail || errText;
      } catch {}
      throw new Error(msg);
    }
    return r.json();
  };

  // Perform Recipient Directory Lookup
  const handleLookup = async (queryToSearch = searchQuery) => {
    setSearching(true);
    setErr("");
    try {
      const q = encodeURIComponent(queryToSearch);
      const r = await fetch(`${API}/api/recipients/lookup?q=${q}`);
      if (!r.ok) throw new Error("Directory lookup failed");
      const data = await r.json();
      setFoundRecipient(data);
      setVf((prev) => ({
        ...prev,
        name: data.full_name,
        location: data.location,
        phone: data.phone
      }));
      setTx((prev) => ({
        ...prev,
        recipient_age_days: data.account_age_days,
        prior_tx_with_recipient: data.prior_transfers
      }));
      setCustStep(2);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSearching(false);
    }
  };

  // Stage 1 Send
  const handleStage1Assess = async () => {
    setBusy(true);
    setErr("");
    try {
      const body = {
        user_id: "U-8821",
        customer_name: tx.customer_name,
        recipient_name: foundRecipient ? foundRecipient.full_name : "John Michael Smith",
        recipient_phone: foundRecipient ? foundRecipient.phone : "+1 214 555 0192",
        amount: Number(tx.amount),
        avg_amount_90d: Number(tx.avg_amount_90d),
        recipient_age_days: Number(tx.recipient_age_days),
        prior_tx_with_recipient: Number(tx.prior_tx_with_recipient),
        tx_last_24h: Number(tx.tx_last_24h),
        hour: Number(tx.hour),
        new_device: Boolean(tx.new_device)
      };
      const result = await post("/api/transactions/assess", body);
      setRes(result);

      if (result.decision === "APPROVE") {
        setCustStep(6);
      } else if (result.decision === "BLOCK" || result.transaction_status === "STOPPED") {
        setCustStep(6);
      } else {
        setCustStep(4);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Real-time Communication Analysis
  const handleAnalyzeCommunication = async () => {
    if (!vf.communication_text.trim()) {
      setErr("Please enter message details or an excerpt before analyzing.");
      return;
    }
    setAnalyzingComm(true);
    setErr("");
    try {
      const analysis = await post("/api/communication/analyze", {
        channel: vf.communication_channel,
        description: vf.communication_text,
        relationship: vf.relationship,
        reason: vf.reason
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
        name: vf.name,
        age: Number(vf.age),
        location: vf.location,
        phone: vf.phone,
        relationship: vf.relationship,
        how_do_you_know: vf.how_do_you_know,
        history: vf.history,
        reason: vf.reason,
        communication_channel: vf.communication_channel,
        communication_text: vf.communication_text.trim() ? vf.communication_text : null,
        phone_in_user_contacts: false
      });
      setRes(data);
      setCustStep(6);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Manager Actions
  const handleManagerAction = async (action) => {
    if (!selectedCase) return;
    setActionBusy(true);
    try {
      const updated = await post(`/api/manager/investigate/${selectedCase.transaction_id}`, {
        action: action,
        manager_name: "Senior Risk Investigator",
        notes: managerNotes || `Manager decision executed: ${action}`
      });
      setSelectedCase(updated);
      setManagerNotes("");
      const q = await (await fetch(`${API}/api/manager/queue`)).json();
      setManagerQueue(q);
      if (res && res.transaction_id === updated.transaction_id) {
        setRes(updated);
      }
    } catch (e) {
      alert("Manager action failed: " + e.message);
    } finally {
      setActionBusy(false);
    }
  };

  const applyPreset = (preset) => {
    setVf({
      ...vf,
      communication_channel: preset.channel,
      communication_text: preset.text,
      reason: preset.reason,
      history: preset.history,
      relationship: preset.relationship
    });
    setCommAnalysis(null);
  };

  const getScoreColor = (score) => {
    if (score < 0.35) return "#10b981";
    if (score < 0.70) return "#f59e0b";
    return "#f43f5e";
  };

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 16px 60px" }}>
      {/* Top Main Navigation: Customer Mobile App vs Bank Operations Console */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 20px",
        background: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(12px)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        marginBottom: 28
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "linear-gradient(135deg, #0056b3, #38bdf8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            boxShadow: "0 0 16px rgba(56, 189, 248, 0.35)"
          }}>
            🏦
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", color: "#fff" }}>
              Risk Shield Banking Network
            </h1>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Real-Time Verification, Agentic AI Forensics & Human Operations
            </p>
          </div>
        </div>

        {/* Portal Switcher Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0, 0, 0, 0.3)", padding: 4, borderRadius: 24, border: "1px solid var(--border-subtle)" }}>
          <button
            type="button"
            onClick={() => setActivePortal("customer")}
            style={{
              padding: "7px 16px",
              borderRadius: 20,
              border: 0,
              background: activePortal === "customer" ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "transparent",
              color: activePortal === "customer" ? "#fff" : "var(--text-muted)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <span>📱</span> Customer Banking App
          </button>

          <button
            type="button"
            onClick={() => setActivePortal("manager")}
            style={{
              padding: "7px 16px",
              borderRadius: 20,
              border: 0,
              background: activePortal === "manager" ? "linear-gradient(135deg, #0284c7, #0369a1)" : "transparent",
              color: activePortal === "manager" ? "#fff" : "var(--text-muted)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              position: "relative"
            }}
          >
            <span>👨💼</span> Bank Operations
            {managerQueue.length > 0 && (
              <span style={{
                background: "#f43f5e",
                color: "#fff",
                fontSize: 10,
                fontWeight: 800,
                padding: "1px 6px",
                borderRadius: 10,
                marginLeft: 4
              }}>
                {managerQueue.length}
              </span>
            )}
          </button>
        </div>

        {/* System Status Pill & Auth User Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: apiOnline ? "#10b981" : "#ef4444",
              boxShadow: apiOnline ? "0 0 8px #10b981" : "none"
            }} />
            <span>Engine: {apiOnline ? "Active" : "Offline"}</span>
          </div>

          {currentUser ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255, 255, 255, 0.06)", padding: "4px 12px", borderRadius: 20, border: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: 12, color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                <span>👤</span> {currentUser.full_name}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  background: "rgba(239, 68, 68, 0.2)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  borderRadius: 12,
                  color: "#fca5a5",
                  fontSize: 11,
                  padding: "2px 8px",
                  cursor: "pointer",
                  fontWeight: 700
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: "var(--accent-blue)", background: "rgba(56, 189, 248, 0.12)", padding: "3px 10px", borderRadius: 12, border: "1px solid rgba(56, 189, 248, 0.3)" }}>
              🔒 Sign In Required
            </div>
          )}
        </div>
      </header>

      {/* Global Error Banner */}
      {err && (
        <div style={{
          background: "rgba(239, 68, 68, 0.15)",
          border: "1px solid rgba(239, 68, 68, 0.4)",
          borderRadius: "var(--radius-md)",
          padding: "12px 18px",
          color: "#fca5a5",
          fontSize: 13,
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>⚠️ {err}</span>
          <button onClick={() => setErr("")} style={{ background: "transparent", border: 0, color: "#fca5a5", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* =========================================================================
          VIEW 1: CUSTOMER BANKING WEB PORTAL (AUTH OR TRANSFERS)
         ========================================================================= */}
      {activePortal === "customer" && !currentUser && (
        <AuthPortal
          API={API}
          currentTheme={currentTheme}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            localStorage.setItem("risk_shield_user", JSON.stringify(user));
          }}
          setErr={setErr}
        />
      )}

      {activePortal === "customer" && currentUser && (
        <div style={{ maxWidth: 840, margin: "0 auto" }}>
          {/* User Status Bar & Box Style Selector */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "0 4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 13, color: "#fff", display: "flex", alignItems: "center", gap: 6, fontWeight: 700, textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>
                <span>✨</span>
                <span>QuickPay Transfer Portal</span>
              </div>
              <span style={{ fontSize: 11, color: "#34d399", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.35)", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>
                ✓ Authenticated
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255, 255, 255, 0.85)", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
                🎨 Box Color:
              </span>
              {Object.values(THEMES).map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setBoxTheme(t.id)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 16,
                    border: boxTheme === t.id ? "1.5px solid #38bdf8" : "1px solid rgba(255,255,255,0.25)",
                    background: boxTheme === t.id ? "rgba(56, 189, 248, 0.3)" : "rgba(0,0,0,0.5)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: boxTheme === t.id ? 700 : 500,
                    cursor: "pointer",
                    backdropFilter: "blur(8px)",
                    boxShadow: boxTheme === t.id ? "0 0 14px rgba(56, 189, 248, 0.55)" : "none"
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Big Colorful Rectangle Box */}
          <div className="animate-fade-in" style={{
            background: currentTheme.boxBg,
            backdropFilter: "blur(24px)",
            border: currentTheme.border,
            borderRadius: "var(--radius-lg)",
            boxShadow: currentTheme.boxShadow,
            overflow: "hidden",
            transition: "all 0.3s ease"
          }}>
            {/* Top Glowing Ribbon Stripe */}
            <div style={{ height: 5, background: currentTheme.topRibbon, width: "100%" }} />

            {/* In-App Customer Navigation Bar */}
            <div style={{
              padding: "16px 22px 14px",
              background: currentTheme.navBg,
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {custStep > 1 && custStep !== 6 && (
                  <button
                    type="button"
                    onClick={() => setCustStep(custStep - 1)}
                    style={{ background: "transparent", border: 0, color: "#fff", fontSize: 18, cursor: "pointer", padding: "0 4px" }}
                  >
                    ←
                  </button>
                )}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13 }}>🛡️</span>
                    <span style={{ fontSize: 11, color: "#fff", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      QuickPay
                    </span>
                    <span style={{ fontSize: 11, color: "var(--accent-blue)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      + Risk Shield
                    </span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
                    {custStep === 1 && "Send Money"}
                    {custStep === 2 && "Verify Recipient"}
                    {custStep === 3 && "Transfer Details"}
                    {custStep === 4 && "Security Review"}
                    {custStep === 5 && "Recipient Form"}
                    {custStep === 6 && "Transfer Status"}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                <span style={{ fontSize: 11, color: "var(--text-faint)", background: "rgba(255, 255, 255, 0.05)", padding: "3px 8px", borderRadius: 8 }}>
                  Step {custStep} of 6
                </span>
                <span style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                  🔒 Secure • Fast • Reliable
                </span>
              </div>
            </div>

            <div style={{ padding: "22px 24px 32px" }}>
              {/* Account Balance Card */}
              <div style={{
                background: currentTheme.balanceBg,
                border: currentTheme.balanceBorder,
                borderRadius: "var(--radius-md)",
                padding: "16px 20px",
                marginBottom: 22,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)"
              }}>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {currentUser.full_name} • FROM ACCOUNT
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
                    {currentUser.account_number || "Advantage Checking (...8492)"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", letterSpacing: 0.5 }}>AVAILABLE</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#34d399", fontFamily: "var(--font-mono)" }}>
                    ${formatUSD(currentUser.balance || 14250)}
                  </div>
                </div>
              </div>

              {/* -------------------------------------------------------------
                  CUSTOMER STEP 1: SEARCH / FIND RECIPIENT
                 ------------------------------------------------------------- */}
              {custStep === 1 && (
                <div className="animate-fade-in">
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>
                      ENTER RECIPIENT PHONE NUMBER OR EMAIL:
                    </label>

                    {/* Mode Tabs */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                      <button
                        type="button"
                        onClick={() => { setSearchMode("phone"); setSearchQuery("+1 (214) 555-1641"); }}
                        style={{
                          flex: 1,
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: `1px solid ${searchMode === "phone" ? "var(--primary)" : "var(--border-subtle)"}`,
                          background: searchMode === "phone" ? "rgba(99, 102, 241, 0.2)" : "rgba(0,0,0,0.3)",
                          color: searchMode === "phone" ? "#fff" : "var(--text-muted)",
                          fontSize: 12,
                          cursor: "pointer"
                        }}
                      >
                        📱 Phone Number
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSearchMode("email"); setSearchQuery("r.smith@gmail.com"); }}
                        style={{
                          flex: 1,
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: `1px solid ${searchMode === "email" ? "var(--primary)" : "var(--border-subtle)"}`,
                          background: searchMode === "email" ? "rgba(99, 102, 241, 0.2)" : "rgba(0,0,0,0.3)",
                          color: searchMode === "email" ? "#fff" : "var(--text-muted)",
                          fontSize: 12,
                          cursor: "pointer"
                        }}
                      >
                        📧 Email Address
                      </button>
                    </div>

                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={searchMode === "phone" ? "+1 (XXX) XXX-XXXX" : "name@example.com"}
                        style={{
                          width: "100%",
                          padding: "12px 14px",
                          background: "rgba(0, 0, 0, 0.4)",
                          border: "1px solid var(--border-glow)",
                          borderRadius: "var(--radius-md)",
                          color: "#fff",
                          fontSize: 15
                        }}
                      />
                    </div>
                  </div>

                  {/* Quick Enrolled Contacts Suggestions */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 8 }}>
                      Enrolled Directory Contacts:
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        { name: "John Michael Smith", phone: "+1 (214) 555-1641", loc: "Dallas, TX", tag: "⚠️ New Recipient" },
                        { name: "Sarah Elizabeth Miller", phone: "+1 (415) 555-2481", loc: "San Francisco, CA", tag: "✓ Known Contact" },
                        { name: "David Alexander Vance", phone: "+1 (312) 555-8839", loc: "Chicago, IL", tag: "⚠️ High Velocity" }
                      ].map((c, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setSearchQuery(c.phone);
                            handleLookup(c.phone);
                          }}
                          style={{
                            background: "rgba(255, 255, 255, 0.03)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: 8,
                            padding: "10px 12px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                            transition: "background 0.15s"
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.phone} • {c.loc}</div>
                          </div>
                          <span style={{ fontSize: 10, background: "rgba(255, 255, 255, 0.08)", padding: "2px 8px", borderRadius: 10, color: "var(--text-muted)" }}>
                            {c.tag}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLookup()}
                    disabled={searching || !searchQuery.trim()}
                    style={{
                      width: "100%",
                      padding: "14px",
                      background: currentTheme.primaryBtn,
                      border: 0,
                      borderRadius: "var(--radius-md)",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: searching ? "not-allowed" : "pointer",
                      boxShadow: currentTheme.primaryBtnGlow,
                      letterSpacing: "0.5px"
                    }}
                  >
                    {searching ? "Searching Directory…" : "FIND RECIPIENT →"}
                  </button>
                </div>
              )}

              {/* -------------------------------------------------------------
                  CUSTOMER STEP 2: RECIPIENT FOUND VERIFICATION SCREEN (BofA style)
                 ------------------------------------------------------------- */}
              {custStep === 2 && foundRecipient && (
                <div className="animate-fade-in">
                  <div style={{
                    background: "rgba(15, 23, 42, 0.75)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgba(56, 189, 248, 0.28)",
                    borderRadius: "var(--radius-lg)",
                    padding: "24px 20px",
                    marginBottom: 20,
                    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.45), 0 0 25px rgba(56, 189, 248, 0.08)"
                  }}>
                    <div style={{ textAlign: "center", marginBottom: 20 }}>
                      <div style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, rgba(30, 58, 138, 0.8), rgba(56, 189, 248, 0.25))",
                        border: "2px solid rgba(56, 189, 248, 0.6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 30,
                        margin: "0 auto 12px",
                        boxShadow: "0 0 20px rgba(56, 189, 248, 0.35)"
                      }}>
                        👤
                      </div>
                      <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>
                        {foundRecipient.full_name}
                      </h3>
                      <div style={{ fontSize: 12, color: "var(--accent-blue)", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                        <span>🛡️</span> Registered Network Recipient
                      </div>
                    </div>

                    <div style={{
                      background: "rgba(0, 0, 0, 0.35)",
                      borderRadius: 10,
                      padding: "14px 16px",
                      marginBottom: 16,
                      border: "1px solid rgba(255, 255, 255, 0.06)"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 6 }}>
                          <span>📱</span> Masked Phone:
                        </span>
                        <span style={{ color: "#fff", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                          {foundRecipient.masked_phone}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 6 }}>
                          <span>✉️</span> Masked Email:
                        </span>
                        <span style={{ color: "#fff", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                          {foundRecipient.masked_email}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, padding: "8px 0" }}>
                        <span style={{ color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 6 }}>
                          <span>📍</span> Location:
                        </span>
                        <span style={{ color: "#fff", fontWeight: 700 }}>
                          {foundRecipient.location}
                        </span>
                      </div>
                    </div>

                    {/* Verification Status Badges */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                      <div style={{
                        fontSize: 12,
                        color: "#34d399",
                        background: "rgba(16, 185, 129, 0.1)",
                        border: "1px solid rgba(16, 185, 129, 0.25)",
                        padding: "8px 12px",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 8
                      }}>
                        <span style={{ fontWeight: 800 }}>✓</span> Phone matches registered network recipient
                      </div>
                      <div style={{
                        fontSize: 12,
                        color: "#34d399",
                        background: "rgba(16, 185, 129, 0.1)",
                        border: "1px solid rgba(16, 185, 129, 0.25)",
                        padding: "8px 12px",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 8
                      }}>
                        <span style={{ fontWeight: 800 }}>✓</span> Recipient bank account verified
                      </div>
                      {foundRecipient.is_new_recipient && (
                        <div style={{
                          fontSize: 12,
                          color: "#fbbf24",
                          background: "rgba(245, 158, 11, 0.1)",
                          border: "1px solid rgba(245, 158, 11, 0.25)",
                          padding: "8px 12px",
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          gap: 8
                        }}>
                          <span style={{ fontWeight: 800 }}>⚠️</span> New recipient (no prior transfer history with you)
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setCustStep(3)}
                      style={{
                        width: "100%",
                        padding: "14px",
                        background: "linear-gradient(135deg, #10b981, #059669)",
                        border: 0,
                        borderRadius: "var(--radius-md)",
                        color: "#fff",
                        fontSize: 14,
                        fontWeight: 800,
                        cursor: "pointer",
                        boxShadow: "0 0 20px rgba(16, 185, 129, 0.35)",
                        letterSpacing: "0.3px"
                      }}
                    >
                      [✓ THIS IS THE CORRECT PERSON]
                    </button>

                    <div style={{ textAlign: "center", marginTop: 12 }}>
                      <button
                        type="button"
                        onClick={() => setCustStep(1)}
                        style={{
                          background: "transparent",
                          border: 0,
                          color: "var(--text-muted)",
                          fontSize: 12,
                          cursor: "pointer",
                          textDecoration: "underline"
                        }}
                      >
                        ← Not the right person? Search again
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  CUSTOMER STEP 3: AMOUNT & PURPOSE
                 ------------------------------------------------------------- */}
              {custStep === 3 && (
                <div className="animate-fade-in">
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                      Transfer Amount ($ USD):
                    </label>
                    <input
                      type="number"
                      value={tx.amount}
                      onChange={(e) => setTx({ ...tx, amount: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        background: "rgba(0,0,0,0.4)",
                        border: "1px solid var(--border-glow)",
                        borderRadius: "var(--radius-md)",
                        color: "#fff",
                        fontSize: 22,
                        fontWeight: 800,
                        fontFamily: "var(--font-mono)"
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                      What's this for? (Memo):
                    </label>
                    <input
                      type="text"
                      value={tx.memo}
                      onChange={(e) => setTx({ ...tx, memo: e.target.value })}
                      placeholder="e.g. Dinner, rent, emergency assistance"
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

                  {/* Preset Quick Amounts */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 6 }}>
                      Research Scenario Presets:
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setTx({ ...tx, amount: 8500, avg_amount_90d: 120, prior_tx_with_recipient: 0 })}
                        style={{ padding: "8px", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: 6, color: "#fbbf24", fontSize: 12, cursor: "pointer" }}
                      >
                        ⚠️ High Risk ($8,500)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTx({ ...tx, amount: 75, avg_amount_90d: 90, prior_tx_with_recipient: 10 })}
                        style={{ padding: "8px", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 6, color: "#34d399", fontSize: 12, cursor: "pointer" }}
                      >
                        ✓ Low Risk ($75)
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleStage1Assess}
                    disabled={busy || !tx.amount}
                    style={{
                      width: "100%",
                      padding: "14px",
                      background: currentTheme.primaryBtn,
                      border: 0,
                      borderRadius: "var(--radius-md)",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: busy ? "not-allowed" : "pointer",
                      boxShadow: currentTheme.primaryBtnGlow,
                      letterSpacing: "0.5px"
                    }}
                  >
                    {busy ? "Evaluating Real-Time Risk Model…" : "CONTINUE TO TRANSFER →"}
                  </button>
                </div>
              )}

              {/* -------------------------------------------------------------
                  CUSTOMER STEP 4: INTERVENTION WARNING (I WANT TO PAY)
                 ------------------------------------------------------------- */}
              {custStep === 4 && res && (
                <div className="animate-fade-in" style={{ textAlign: "center", padding: "10px 0" }}>
                  <div className="pulse-warning" style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "2px solid #f59e0b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    margin: "0 auto 16px"
                  }}>
                    ⚠️
                  </div>

                  <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fbbf24", marginBottom: 6 }}>
                    Transaction Needs Review
                  </h3>
                  <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
                    Our real-time security model flagged this transfer for additional verification
                    (Initial risk score: {(res.risk_score * 100).toFixed(0)}%).
                  </p>

                  {res.reasons && res.reasons.length > 0 && (
                    <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "12px 14px", textAlign: "left", marginBottom: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 6 }}>
                        Risk Flags:
                      </div>
                      <ul style={{ paddingLeft: 16, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                        {res.reasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setCustStep(1)}
                      style={{ flex: 1, padding: "12px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--border-subtle)", borderRadius: 8, color: "var(--text-muted)", fontSize: 13 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustStep(5)}
                      style={{
                        flex: 1.6,
                        padding: "12px",
                        background: "linear-gradient(135deg, #f59e0b, #d97706)",
                        border: 0,
                        borderRadius: 8,
                        color: "#000",
                        fontSize: 14,
                        fontWeight: 800,
                        cursor: "pointer",
                        boxShadow: "0 0 16px rgba(245, 158, 11, 0.4)"
                      }}
                    >
                      I WANT TO PAY →
                    </button>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  CUSTOMER STEP 5: RECIPIENT VERIFICATION & SOCIAL EVIDENCE
                 ------------------------------------------------------------- */}
              {custStep === 5 && (
                <div className="animate-fade-in">
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 4 }}>
                      Recipient Details
                    </label>
                    <div style={{ background: "rgba(0,0,0,0.3)", padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 10 }}>
                      <div><strong>{vf.name}</strong> • {vf.location}</div>
                      <div style={{ color: "var(--text-muted)" }}>{vf.phone}</div>
                    </div>

                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      Relationship to Recipient:
                    </label>
                    <select
                      value={vf.relationship}
                      onChange={(e) => setVf({ ...vf, relationship: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", background: "#0f172a", border: "1px solid var(--border-subtle)", borderRadius: 6, color: "#fff", fontSize: 13, marginBottom: 10 }}
                    >
                      <option value="friend">Friend</option>
                      <option value="family">Family Member</option>
                      <option value="business">Business / Contractor</option>
                      <option value="other">Other / New Contact</option>
                    </select>

                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      Payment Reason:
                    </label>
                    <input
                      type="text"
                      value={vf.reason}
                      onChange={(e) => setVf({ ...vf, reason: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-subtle)", borderRadius: 6, color: "#fff", fontSize: 13, marginBottom: 14 }}
                    />
                  </div>

                  {/* Social Communication Forensics */}
                  <div style={{ background: "rgba(99, 102, 241, 0.05)", border: "1px solid rgba(99, 102, 241, 0.3)", borderRadius: 8, padding: 12, marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                      💬 Communication Evidence (POLICY-008 Opt-In)
                    </div>

                    {/* Channels */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                      {CHANNELS.map((ch) => (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => setVf({ ...vf, communication_channel: ch.id })}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 14,
                            border: `1px solid ${vf.communication_channel === ch.id ? ch.color : "var(--border-subtle)"}`,
                            background: vf.communication_channel === ch.id ? "rgba(99, 102, 241, 0.25)" : "rgba(0,0,0,0.3)",
                            color: vf.communication_channel === ch.id ? "#fff" : "var(--text-muted)",
                            fontSize: 11,
                            cursor: "pointer"
                          }}
                        >
                          {ch.icon} {ch.name}
                        </button>
                      ))}
                    </div>

                    {/* Presets */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                      {PRESETS.map((p, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => applyPreset(p)}
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: "3px 8px", fontSize: 10, color: "var(--text-muted)", cursor: "pointer" }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={2}
                      value={vf.communication_text}
                      onChange={(e) => setVf({ ...vf, communication_text: e.target.value })}
                      placeholder="Describe what the person told you or paste excerpt..."
                      style={{ width: "100%", padding: "8px 10px", background: "rgba(0,0,0,0.4)", border: "1px solid var(--border-subtle)", borderRadius: 6, color: "#fff", fontSize: 12, marginBottom: 8 }}
                    />

                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        onClick={handleAnalyzeCommunication}
                        disabled={analyzingComm || !vf.communication_text.trim()}
                        style={{ padding: "6px 12px", background: "rgba(99,102,241,0.3)", border: "1px solid var(--border-glow)", borderRadius: 6, color: "#a5b4fc", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                      >
                        {analyzingComm ? "Analyzing…" : "⚡ Analyze Message"}
                      </button>
                    </div>

                    {/* Analysis Mini Card */}
                    {commAnalysis && (
                      <div style={{ marginTop: 8, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: 8, fontSize: 11 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span>Signal Strength: <strong>{((commAnalysis.evidence_strength || 0) * 100).toFixed(0)}%</strong></span>
                          <span>Urgency: <strong>{((commAnalysis.signals?.urgency || 0) * 100).toFixed(0)}%</strong></span>
                        </div>
                        <div style={{ color: "var(--text-muted)" }}>
                          {commAnalysis.evidence && commAnalysis.evidence[0]}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={busy}
                    style={{
                      width: "100%",
                      padding: "13px",
                      background: "linear-gradient(135deg, #6366f1, #38bdf8)",
                      border: 0,
                      borderRadius: "var(--radius-md)",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: busy ? "not-allowed" : "pointer"
                    }}
                  >
                    {busy ? "Running Multi-Agent Audit…" : "SUBMIT VERIFICATION"}
                  </button>
                </div>
              )}

              {/* -------------------------------------------------------------
                  CUSTOMER STEP 6: THREE TIERED OUTCOMES
                  A: Auto-Approved | B: STOPPED (Critical) | C: ON HOLD (Queue)
                 ------------------------------------------------------------- */}
              {custStep === 6 && res && (
                <div className="animate-fade-in" style={{ textAlign: "center" }}>
                  {/* OUTCOME A: APPROVED (Very low risk or Manager Approved) */}
                  {(res.decision === "APPROVE" || res.status === "APPROVED" || res.status === "APPROVED_BY_MANAGER") && (
                    <div>
                      <div style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: "rgba(16, 185, 129, 0.15)",
                        border: "2px solid #10b981",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 30,
                        margin: "0 auto 16px"
                      }}>
                        ✓
                      </div>
                      <h3 style={{ fontSize: 20, fontWeight: 800, color: "#34d399", marginBottom: 4 }}>
                        Transfer Completed
                      </h3>
                      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
                        ${formatUSD(res.amount || tx.amount)} has been successfully transferred to {res.recipient_name}.
                      </p>

                      <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 12, textAlign: "left", fontSize: 12, marginBottom: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                          <span style={{ color: "var(--text-faint)" }}>Status:</span>
                          <span style={{ color: "#34d399", fontWeight: 700 }}>✓ COMPLETED</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                          <span style={{ color: "var(--text-faint)" }}>Reference:</span>
                          <span style={{ fontFamily: "var(--font-mono)", color: "#fff" }}>{res.transaction_id}</span>
                        </div>
                        {res.manager_decision && (
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                            <span style={{ color: "var(--text-faint)" }}>Manager Review:</span>
                            <span style={{ color: "#a5b4fc" }}>Approved by {res.manager_decision.manager_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* OUTCOME B: CRITICAL RISK / STOPPED */}
                  {(res.decision === "BLOCK" || res.status === "BLOCKED" || res.transaction_status === "STOPPED" || res.status === "DENIED_BY_MANAGER") && (
                    <div className="pulse-critical" style={{
                      background: "rgba(225, 29, 72, 0.1)",
                      border: "1px solid rgba(225, 29, 72, 0.4)",
                      borderRadius: "var(--radius-lg)",
                      padding: 24,
                      marginBottom: 20
                    }}>
                      <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        background: "rgba(225, 29, 72, 0.2)",
                        border: "2px solid #e11d48",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 28,
                        margin: "0 auto 12px"
                      }}>
                        🚫
                      </div>
                      <h3 style={{ fontSize: 20, fontWeight: 900, color: "#fb7185", marginBottom: 8 }}>
                        TRANSFER STOPPED
                      </h3>
                      <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
                        Your transfer was not completed because critical security risk indicators were detected.
                      </p>

                      <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: 8, padding: 12, textAlign: "left", fontSize: 12, marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                          <span style={{ color: "var(--text-faint)" }}>Amount:</span>
                          <span style={{ fontWeight: 700, color: "#fff" }}>${formatUSD(res.amount || tx.amount)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                          <span style={{ color: "var(--text-faint)" }}>Recipient:</span>
                          <span style={{ fontWeight: 700, color: "#fff" }}>{res.recipient_name}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                          <span style={{ color: "var(--text-faint)" }}>Funds Status:</span>
                          <span style={{ color: "#fb7185", fontWeight: 700 }}>Your funds were not transferred.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* OUTCOME C: HOLD -> AWAITING BANK REVIEW */}
                  {(res.decision === "HOLD" && res.status === "ON_HOLD") && (
                    <div className="pulse-warning" style={{
                      background: "rgba(245, 158, 11, 0.08)",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      borderRadius: "var(--radius-lg)",
                      padding: 24,
                      marginBottom: 20
                    }}>
                      <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        background: "rgba(245, 158, 11, 0.15)",
                        border: "2px solid #f59e0b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 28,
                        margin: "0 auto 12px"
                      }}>
                        🟡
                      </div>
                      <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fbbf24", marginBottom: 6 }}>
                        TRANSFER ON HOLD
                      </h3>
                      <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
                        This transfer requires additional review before it can be completed.
                      </p>

                      <div style={{ background: "rgba(0,0,0,0.35)", borderRadius: 8, padding: 12, textAlign: "left", fontSize: 12, marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                          <span style={{ color: "var(--text-faint)" }}>Amount:</span>
                          <span style={{ color: "#fff", fontWeight: 700 }}>${formatUSD(res.amount || tx.amount)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                          <span style={{ color: "var(--text-faint)" }}>Recipient:</span>
                          <span style={{ color: "#fff", fontWeight: 700 }}>{res.recipient_name}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                          <span style={{ color: "var(--text-faint)" }}>Risk Score:</span>
                          <span style={{ color: "#fbbf24", fontWeight: 700 }}>{(res.risk_score * 100).toFixed(1)}%</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                          <span style={{ color: "var(--text-faint)" }}>Reference ID:</span>
                          <span style={{ fontFamily: "var(--font-mono)", color: "#a5b4fc" }}>{res.transaction_id}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 6, paddingTop: 6 }}>
                          <span style={{ color: "var(--text-faint)" }}>Status:</span>
                          <span style={{ color: "#fbbf24", fontWeight: 800 }}>⏳ Awaiting bank review</span>
                        </div>
                      </div>

                      <div style={{
                        background: "rgba(99, 102, 241, 0.1)",
                        border: "1px solid rgba(99, 102, 241, 0.3)",
                        borderRadius: 8,
                        padding: "10px 12px",
                        fontSize: 12,
                        color: "#c7d2fe",
                        textAlign: "left",
                        marginBottom: 16
                      }}>
                        💡 <strong>Investigation Queue Active:</strong> A bank operations manager is currently reviewing the multi-agent signals. Switch to the <strong>Bank Operations</strong> tab above to approve or deny this case in real time!
                      </div>
                    </div>
                  )}

                  {/* Return Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setCustStep(1);
                      setRes(null);
                      setCommAnalysis(null);
                      setVf({ ...vf, communication_text: "" });
                    }}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Return to Transfers
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: BANK OPERATIONS & REVIEW QUEUE (Manager Console)
         ========================================================================= */}
      {activePortal === "manager" && (
        <div className="animate-fade-in" style={{
          background: "var(--bg-card)",
          backdropFilter: "var(--glass-blur)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: 28,
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
        }}>
          {/* Operations Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 20, borderBottom: "1px solid var(--border-subtle)", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-blue)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                HUMAN-IN-THE-LOOP AGENTIC AI WORKFLOW
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginTop: 2 }}>
                🛡️ Risk Shield — Bank Operations Console
              </h2>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                background: managerQueue.length > 0 ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)",
                border: `1px solid ${managerQueue.length > 0 ? "#f59e0b" : "#10b981"}`,
                borderRadius: 20,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 700,
                color: managerQueue.length > 0 ? "#fbbf24" : "#34d399"
              }}>
                Pending Investigations: {managerQueue.length}
              </div>
            </div>
          </div>

          {/* Grid Layout: Left Queue List + Right Investigation Inspector */}
          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24 }}>
            {/* Left Queue List */}
            <div style={{ background: "rgba(0, 0, 0, 0.3)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 12 }}>
                Active Case Queue ({managerQueue.length})
              </div>

              {managerQueue.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-faint)", fontSize: 13 }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
                  No transactions currently on hold.
                  <div style={{ fontSize: 11, marginTop: 4 }}>High-risk transfers flagged in the customer app appear here automatically.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {managerQueue.map((item) => {
                    const isSelected = selectedCase && selectedCase.transaction_id === item.transaction_id;
                    return (
                      <div
                        key={item.transaction_id}
                        onClick={() => setSelectedCase(item)}
                        style={{
                          background: isSelected ? "rgba(99, 102, 241, 0.18)" : "rgba(255, 255, 255, 0.03)",
                          border: `1px solid ${isSelected ? "var(--primary)" : "var(--border-subtle)"}`,
                          borderRadius: 8,
                          padding: "12px 14px",
                          cursor: "pointer",
                          transition: "all 0.15s"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", fontFamily: "var(--font-mono)" }}>
                            {item.transaction_id}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#fbbf24" }}>
                            🟡 HOLD
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          Customer: {item.customer_name || "Harshit P."}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          Recipient: {item.recipient_name}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12 }}>
                          <span style={{ fontWeight: 700, color: "#fff" }}>${formatUSD(item.amount)}</span>
                          <span style={{ color: getScoreColor(item.risk_score), fontWeight: 700 }}>
                            Risk: {(item.risk_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Case Inspection Card */}
            <div>
              {selectedCase ? (
                <div style={{ background: "rgba(0, 0, 0, 0.35)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", padding: 24 }}>
                  {/* Case Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 16, borderBottom: "1px solid var(--border-subtle)", marginBottom: 18 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase" }}>INVESTIGATION CASE</div>
                      <h3 style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                        {selectedCase.transaction_id}
                      </h3>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "var(--text-faint)" }}>COMBINED RISK SCORE</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: getScoreColor(selectedCase.risk_score), fontFamily: "var(--font-mono)" }}>
                        {(selectedCase.risk_score * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Customer & Recipient Summary */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
                    <div style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: "var(--text-faint)" }}>CUSTOMER</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginTop: 2 }}>
                        {selectedCase.customer_name || "Harshit P."}
                      </div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: "var(--text-faint)" }}>RECIPIENT</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginTop: 2 }}>
                        {selectedCase.recipient_name}
                      </div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: "var(--text-faint)" }}>TRANSFER AMOUNT</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                        ${formatUSD(selectedCase.amount)}
                      </div>
                    </div>
                  </div>

                  {/* Multi-Factor Risk Decomposition */}
                  {selectedCase.risk_breakdown && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 10 }}>
                        Risk Factor Decomposition:
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                        {[
                          { label: "Transaction Risk", val: selectedCase.risk_breakdown.transaction_risk },
                          { label: "Communication Signal", val: selectedCase.risk_breakdown.communication_signal_strength ?? selectedCase.risk_breakdown.communication_risk },
                          { label: "Relationship Risk", val: selectedCase.risk_breakdown.relationship_risk },
                          { label: "History Risk", val: selectedCase.risk_breakdown.history_risk }
                        ].map((rf, idx) => (
                          <div key={idx} style={{ background: "rgba(0,0,0,0.3)", padding: "10px 12px", borderRadius: 8, textAlign: "center" }}>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{rf.label}</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: getScoreColor(rf.val || 0), fontFamily: "var(--font-mono)", marginTop: 4 }}>
                              {((rf.val || 0) * 100).toFixed(0)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Evidence List */}
                  {selectedCase.reasons && selectedCase.reasons.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 8 }}>
                        AI Forensic Evidence:
                      </div>
                      <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "12px 16px" }}>
                        <ul style={{ paddingLeft: 18, color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6 }}>
                          {selectedCase.reasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Agent Audit Trail Summary */}
                  {selectedCase.trace && selectedCase.trace.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 8 }}>
                        🔍 Agent Audit Trail:
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {selectedCase.trace.map((step, idx) => (
                          <div key={idx} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 6, padding: "8px 12px", fontSize: 12, display: "flex", gap: 10 }}>
                            <span style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>#{step.step || idx + 1}</span>
                            <span style={{ fontWeight: 700, color: "#fff" }}>{step.agent || step.action}:</span>
                            <span style={{ color: "var(--accent-blue)" }}>{step.summary || JSON.stringify(step.observation)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Manager Decision Controls */}
                  <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 18 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 8 }}>
                      Manager Decision & Investigation Action:
                    </div>

                    <textarea
                      rows={2}
                      value={managerNotes}
                      onChange={(e) => setManagerNotes(e.target.value)}
                      placeholder="Add investigation notes or rationale before making a decision..."
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        background: "rgba(0,0,0,0.4)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: 6,
                        color: "#fff",
                        fontSize: 13,
                        marginBottom: 14
                      }}
                    />

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                      <button
                        type="button"
                        onClick={() => handleManagerAction("APPROVE")}
                        disabled={actionBusy}
                        style={{
                          padding: "12px",
                          background: "linear-gradient(135deg, #10b981, #059669)",
                          border: 0,
                          borderRadius: 8,
                          color: "#fff",
                          fontSize: 13,
                          fontWeight: 800,
                          cursor: actionBusy ? "not-allowed" : "pointer"
                        }}
                      >
                        ✓ APPROVE TRANSFER
                      </button>

                      <button
                        type="button"
                        onClick={() => handleManagerAction("DENY")}
                        disabled={actionBusy}
                        style={{
                          padding: "12px",
                          background: "linear-gradient(135deg, #e11d48, #be123c)",
                          border: 0,
                          borderRadius: 8,
                          color: "#fff",
                          fontSize: 13,
                          fontWeight: 800,
                          cursor: actionBusy ? "not-allowed" : "pointer"
                        }}
                      >
                        🚫 DENY / STOP TRANSFER
                      </button>

                      <button
                        type="button"
                        onClick={() => handleManagerAction("REQUEST_INFO")}
                        disabled={actionBusy}
                        style={{
                          padding: "12px",
                          background: "rgba(255, 255, 255, 0.08)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: 8,
                          color: "#fff",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: actionBusy ? "not-allowed" : "pointer"
                        }}
                      >
                        ❓ REQUEST MORE INFO
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: 60, color: "var(--text-faint)" }}>
                  Select a transaction case from the queue on the left to review.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
