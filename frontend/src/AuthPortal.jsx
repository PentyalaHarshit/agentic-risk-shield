import React, { useState, useEffect, useRef } from "react";
import HumanVisionDetector from "./HumanVisionDetector";

const DIRECTIONS = [
  { id: "center", title: "1. Look Center", label: "Look Straight Ahead", icon: "👤", instruction: "Align your face directly inside the oval reticle facing forward." },
  { id: "left", title: "2. Turn Left", label: "Turn Head Left", icon: "👤 ←", instruction: "Slowly turn your head to the LEFT so the system maps your profile contour." },
  { id: "right", title: "3. Turn Right", label: "Turn Head Right", icon: "→ 👤", instruction: "Slowly turn your head to the RIGHT to capture your right-side biometric angles." },
  { id: "up_down", title: "4. Look Up / Down", label: "Tilt Up & Down", icon: "↑ 👤 ↓", instruction: "Tilt your head slightly UP and then DOWN for depth & pitch verification." }
];

const REG_STEPS = [
  { id: 1, label: "Personal Info", icon: "👤" },
  { id: 2, label: "Login Details", icon: "🔐" },
  { id: 3, label: "Contact Info", icon: "📱" },
  { id: 4, label: "Verify OTP", icon: "✉️" },
  { id: 5, label: "Face ID", icon: "📷" },
  { id: 6, label: "Account Created", icon: "🏦" }
];

const IS = {
  width: "100%", padding: "12px 14px", background: "rgba(0,0,0,0.45)",
  border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#fff",
  fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border 0.2s"
};
const LS = {
  display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)",
  marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.6px"
};

const FG = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={LS}>{label}</label>
    {children}
  </div>
);

export default function AuthPortal({ API, currentTheme, onLoginSuccess, setErr }) {
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showCPw, setShowCPw] = useState(false);
  const [regStep, setRegStep] = useState(1);

  const [loginForm, setLoginForm] = useState({ user_id: "harshit", password: "RiskShield@2026" });
  const [regForm, setRegForm] = useState({
    full_name: "", date_of_birth: "", address: "", city: "", state: "", zip: "",
    user_id: "", password: "", confirm_password: "", email: "", phone: ""
  });

  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpInfo, setOtpInfo] = useState({ masked_email: "", masked_phone: "", preview: "", user_id: "" });
  const [bankProfile, setBankProfile] = useState(null);
  const [resendCD, setResendCD] = useState(0);
  const [enrollStep, setEnrollStep] = useState(0);
  const [completedDirs, setCompletedDirs] = useState([]);
  const [faceProg, setFaceProg] = useState(0);
  const [faceStat, setFaceStat] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const otpRefs = useRef([]);

  useEffect(() => {
    let active = true;
    const needsCam = (mode === "register" && regStep === 5) || mode === "face_login";
    if (needsCam && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 480, facingMode: "user" } })
        .then(stream => {
          if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
          streamRef.current = stream;
          if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
        }).catch(() => {});
    } else if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    return () => {
      active = false;
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    };
  }, [mode, regStep]);

  useEffect(() => {
    let t1, t2, t3;
    if (mode === "face_login") {
      setFaceProg(15); setFaceStat("Detecting face in frame reticle...");
      t1 = setTimeout(() => { setFaceProg(55); setFaceStat("Extracting 128-point biometric landmark mesh..."); }, 900);
      t2 = setTimeout(() => { setFaceProg(85); setFaceStat("Matching biometric signature against secure enclave..."); }, 1900);
      t3 = setTimeout(async () => {
        setFaceProg(100); setFaceStat("✓ Biometric Match Confirmed! Authenticating...");
        try { const res = await post("/api/auth/login-face", { user_id: loginForm.user_id || "harshit" }); onLoginSuccess(res.user); }
        catch (e) { setErr("Face ID login failed: " + e.message); setMode("login"); }
      }, 2800);
    }
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [mode]);

  useEffect(() => {
    if (resendCD <= 0) return;
    const iv = setInterval(() => setResendCD(c => c - 1), 1000);
    return () => clearInterval(iv);
  }, [resendCD]);

  const post = async (ep, body) => {
    const r = await fetch(`${API}${ep}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) { const t = await r.text(); let m = t; try { m = JSON.parse(t).detail || t; } catch {} throw new Error(m); }
    return r.json();
  };

  const handleLogin = async e => {
    if (e) e.preventDefault();
    if (!loginForm.user_id.trim() || !loginForm.password.trim()) { setErr("Enter both User ID and Password."); return; }
    setBusy(true); setErr("");
    try { const res = await post("/api/auth/login-password", loginForm); onLoginSuccess(res.user); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const step1 = e => {
    if (e) e.preventDefault();
    if (!regForm.full_name.trim()) { setErr("Full legal name required."); return; }
    if (!regForm.date_of_birth) { setErr("Date of birth required."); return; }
    setErr(""); setRegStep(2);
  };

  const step2 = e => {
    if (e) e.preventDefault();
    if (regForm.user_id.length < 4) { setErr("User ID must be 4+ characters."); return; }
    if (regForm.password.length < 8) { setErr("Password must be 8+ characters."); return; }
    if (regForm.password !== regForm.confirm_password) { setErr("Passwords do not match."); return; }
    setErr(""); setRegStep(3);
  };

  const step3 = async e => {
    if (e) e.preventDefault();
    if (!regForm.email.trim() || !regForm.phone.trim()) { setErr("Email and phone required."); return; }
    setBusy(true); setErr("");
    try {
      const res = await post("/api/auth/register", {
        full_name: regForm.full_name, user_id: regForm.user_id,
        password: regForm.password, email: regForm.email, phone: regForm.phone
      });
      setOtpInfo({ masked_email: res.masked_email, masked_phone: res.masked_phone, preview: res.demo_otp_preview, user_id: res.user_id });
      setBankProfile({ customer_id: res.customer_id, account_number: res.account_number, routing_number: res.routing_number, account_type: res.account_type || "Advantage Checking" });
      setOtpDigits(["", "", "", "", "", ""]); setResendCD(30); setRegStep(4);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const otpChange = (i, v) => {
    if (!/^\d*$/.test(v)) return;
    const d = [...otpDigits]; d[i] = v.slice(-1); setOtpDigits(d);
    if (v && i < 5 && otpRefs.current[i + 1]) otpRefs.current[i + 1].focus();
  };

  const otpKey = (i, e) => {
    if (e.key === "Backspace" && !otpDigits[i] && i > 0 && otpRefs.current[i - 1]) otpRefs.current[i - 1].focus();
  };

  const otpPaste = e => {
    e.preventDefault(); const p = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(p)) { setOtpDigits(p.split("")); if (otpRefs.current[5]) otpRefs.current[5].focus(); }
  };

  const verifyOtp = async e => {
    if (e) e.preventDefault(); const code = otpDigits.join("");
    if (code.length !== 6) { setErr("Enter the 6-digit code."); return; }
    setBusy(true); setErr("");
    try { await post("/api/auth/verify-otp", { user_id: otpInfo.user_id || regForm.user_id, code }); setEnrollStep(0); setCompletedDirs([]); setRegStep(5); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const resend = async () => {
    if (resendCD > 0) return; setBusy(true); setErr("");
    try {
      const res = await post("/api/auth/resend-otp", { user_id: otpInfo.user_id || regForm.user_id });
      setOtpInfo(p => ({ ...p, preview: res.demo_otp_preview })); setResendCD(30);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const captureDir = async () => {
    const cur = DIRECTIONS[enrollStep]; if (!cur) return;
    const next = [...completedDirs, cur.id]; setCompletedDirs(next);
    if (enrollStep < 3) { setEnrollStep(enrollStep + 1); } else {
      setBusy(true); setErr("");
      try {
        await post("/api/auth/enroll-face", { user_id: otpInfo.user_id || regForm.user_id, directions_completed: ["center", "left", "right", "up_down"] });
        setEnrollStep(4);
        setTimeout(() => setRegStep(6), 1200);
      } catch (e) { setErr(e.message); } finally { setBusy(false); }
    }
  };

  const finishReg = async () => {
    setBusy(true);
    try { const res = await post("/api/auth/login-face", { user_id: otpInfo.user_id || regForm.user_id }); onLoginSuccess(res.user); }
    catch { setLoginForm({ user_id: otpInfo.user_id || regForm.user_id, password: regForm.password }); setMode("login"); }
    finally { setBusy(false); }
  };

  const startReg = () => {
    setRegForm({ full_name: "", date_of_birth: "", address: "", city: "", state: "", zip: "", user_id: "", password: "", confirm_password: "", email: "", phone: "" });
    setRegStep(1); setOtpDigits(["", "", "", "", "", ""]); setEnrollStep(0); setCompletedDirs([]); setBankProfile(null); setErr(""); setMode("register");
  };

  const PB = {
    width: "100%", padding: "13px", background: currentTheme.primaryBtn, border: 0,
    borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 800,
    cursor: busy ? "not-allowed" : "pointer", boxShadow: currentTheme.primaryBtnGlow,
    letterSpacing: "0.5px", opacity: busy ? 0.8 : 1
  };

  const GB = {
    padding: "12px 20px", background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
    color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, cursor: "pointer"
  };

  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
      <div className="animate-fade-in" style={{ background: currentTheme.boxBg, backdropFilter: "blur(24px)", border: currentTheme.border, borderRadius: "var(--radius-lg)", boxShadow: currentTheme.boxShadow, overflow: "hidden" }}>
        <div style={{ height: 4, background: currentTheme.topRibbon }} />

        {/* Header */}
        <div style={{ padding: "16px 24px", background: currentTheme.navBg, borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #0284c7, #38bdf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 0 16px rgba(56,189,248,0.35)" }}>🛡️</div>
            <div>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ fontSize: 10, color: "#fff", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>QuickPay</span>
                <span style={{ fontSize: 10, color: "var(--accent-blue)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>+ Risk Shield</span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>
                {mode === "login" && "Sign In to Online Banking"}
                {mode === "register" && (REG_STEPS[regStep - 1]?.label || "Register")}
                {mode === "face_login" && "Face ID Biometric Scanner"}
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>🔒 Bank-Grade Encrypted</div>
            {mode === "register" && (
              <div style={{ display: "flex", gap: 4 }}>
                {REG_STEPS.map(s => (
                  <div key={s.id} style={{ width: 22, height: 4, borderRadius: 2, background: s.id < regStep ? "#10b981" : s.id === regStep ? "#38bdf8" : "rgba(255,255,255,0.1)", transition: "background 0.3s" }} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== SIGN IN ===== */}
        {mode === "login" && (
          <div style={{ padding: "28px 28px 34px" }} className="animate-fade-in">
            <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 32, alignItems: "start" }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Sign In with User ID &amp; Password</h3>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 20 }}>Access your checking account and money transfers securely.</p>
                <form onSubmit={handleLogin}>
                  <FG label="User ID">
                    <input id="login-userid" type="text" value={loginForm.user_id} onChange={e => setLoginForm({ ...loginForm, user_id: e.target.value })} placeholder="Enter your User ID" style={IS} />
                  </FG>
                  <FG label="Password">
                    <div style={{ position: "relative" }}>
                      <input id="login-password" type={showPw ? "text" : "password"} value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} placeholder="Enter your password" style={{ ...IS, paddingRight: 60 }} />
                      <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: 0, color: "#38bdf8", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{showPw ? "HIDE" : "SHOW"}</button>
                    </div>
                  </FG>
                  <button id="login-submit" type="submit" disabled={busy} style={PB}>{busy ? "Authenticating…" : "SIGN IN →"}</button>
                </form>
                <div style={{ marginTop: 16, background: "rgba(56,189,248,0.06)", borderRadius: 8, padding: "10px 14px", border: "1px solid rgba(56,189,248,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#38bdf8", marginBottom: 2 }}>⚡ Demo Account:</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>ID: <code style={{ color: "#fff" }}>harshit</code> &nbsp;•&nbsp; PW: <code style={{ color: "#fff" }}>RiskShield@2026</code></div>
                  </div>
                  <button type="button" onClick={() => setLoginForm({ user_id: "harshit", password: "RiskShield@2026" })} style={{ background: "rgba(56,189,248,0.2)", border: "1px solid rgba(56,189,248,0.4)", borderRadius: 6, color: "#38bdf8", padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Pre-fill</button>
                </div>
              </div>

              <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(56,189,248,0.25)", borderRadius: 14, padding: 24, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 280, boxShadow: "0 10px 40px rgba(0,0,0,0.4)" }}>
                <div style={{ width: 70, height: 70, borderRadius: "50%", background: "linear-gradient(135deg, rgba(37,99,235,0.5), rgba(225,29,72,0.4))", border: "2.5px solid #38bdf8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 14, boxShadow: "0 0 28px rgba(56,189,248,0.45)" }}>👤</div>
                <h4 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Sign in with Face ID</h4>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 20, lineHeight: 1.6 }}>Use your enrolled 4-directional biometric profile for instant access.</p>
                <button id="faceid-login-btn" type="button" onClick={() => setMode("face_login")} style={{ ...PB, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><span>📷</span> USE FACE ID SCANNER</button>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 10 }}>Protected by biometric anti-spoofing</div>
              </div>
            </div>

            <div style={{ marginTop: 26, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Don't have an online banking account?</span>
              <button type="button" onClick={startReg} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "9px 18px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Create an Account →</button>
            </div>
          </div>
        )}

        {/* ===== REGISTER ===== */}
        {mode === "register" && (
          <div>
            {/* Step progress bar */}
            <div style={{ padding: "14px 28px 0", background: "rgba(0,0,0,0.2)" }}>
              <div style={{ display: "flex", borderRadius: 8, overflow: "hidden" }}>
                {REG_STEPS.map(s => (
                  <div key={s.id} style={{ flex: 1, textAlign: "center", padding: "7px 2px", background: s.id < regStep ? "rgba(16,185,129,0.15)" : s.id === regStep ? "rgba(56,189,248,0.18)" : "rgba(255,255,255,0.03)", borderBottom: s.id === regStep ? "2px solid #38bdf8" : s.id < regStep ? "2px solid #10b981" : "2px solid transparent", transition: "all 0.3s" }}>
                    <div style={{ fontSize: 12 }}>{s.id < regStep ? "✓" : s.icon}</div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: s.id === regStep ? "#38bdf8" : s.id < regStep ? "#10b981" : "rgba(255,255,255,0.25)", marginTop: 2, textTransform: "uppercase" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 1: Personal Info */}
            {regStep === 1 && (
              <div style={{ padding: "22px 28px 28px" }} className="animate-fade-in">
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Personal Information</h3>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 18 }}>Enter your legal details as they appear on your government-issued ID.</p>
                <form onSubmit={step1}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <FG label="Full Legal Name *">
                      <input id="reg-fullname" type="text" value={regForm.full_name} onChange={e => setRegForm({ ...regForm, full_name: e.target.value })} placeholder="e.g. Harshit Pentyala" required style={IS} />
                    </FG>
                    <FG label="Date of Birth *">
                      <input id="reg-dob" type="date" value={regForm.date_of_birth} onChange={e => setRegForm({ ...regForm, date_of_birth: e.target.value })} required style={{ ...IS, colorScheme: "dark" }} />
                    </FG>
                  </div>
                  <FG label="Street Address">
                    <input id="reg-address" type="text" value={regForm.address} onChange={e => setRegForm({ ...regForm, address: e.target.value })} placeholder="e.g. 4521 Oak Creek Dr" style={IS} />
                  </FG>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
                    <FG label="City"><input id="reg-city" type="text" value={regForm.city} onChange={e => setRegForm({ ...regForm, city: e.target.value })} placeholder="Dallas" style={IS} /></FG>
                    <FG label="State"><input id="reg-state" type="text" value={regForm.state} onChange={e => setRegForm({ ...regForm, state: e.target.value })} placeholder="TX" maxLength={2} style={IS} /></FG>
                    <FG label="ZIP Code"><input id="reg-zip" type="text" value={regForm.zip} onChange={e => setRegForm({ ...regForm, zip: e.target.value })} placeholder="75201" maxLength={10} style={IS} /></FG>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                    <button type="button" onClick={() => { setErr(""); setMode("login"); }} style={GB}>← Back to Sign In</button>
                    <button id="reg-step1-next" type="submit" disabled={busy} style={{ ...PB, flex: 1 }}>CONTINUE: Login Details →</button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 2: Login Credentials */}
            {regStep === 2 && (
              <div style={{ padding: "22px 28px 28px" }} className="animate-fade-in">
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Create Login Credentials</h3>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 18 }}>Choose a unique User ID and a strong password.</p>
                <form onSubmit={step2}>
                  <FG label="User ID * (min 4 characters, no spaces)">
                    <input id="reg-userid" type="text" value={regForm.user_id} onChange={e => setRegForm({ ...regForm, user_id: e.target.value.replace(/\s/g, "").toLowerCase() })} placeholder="e.g. harshit92" required minLength={4} style={IS} />
                  </FG>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <FG label="Password * (min 8 characters)">
                      <div style={{ position: "relative" }}>
                        <input id="reg-password" type={showPw ? "text" : "password"} value={regForm.password} onChange={e => setRegForm({ ...regForm, password: e.target.value })} placeholder="Create a strong password" required style={{ ...IS, paddingRight: 55 }} />
                        <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: 0, color: "#38bdf8", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{showPw ? "HIDE" : "SHOW"}</button>
                      </div>
                    </FG>
                    <FG label="Confirm Password *">
                      <div style={{ position: "relative" }}>
                        <input id="reg-confirm-pw" type={showCPw ? "text" : "password"} value={regForm.confirm_password} onChange={e => setRegForm({ ...regForm, confirm_password: e.target.value })} placeholder="Re-enter password" required style={{ ...IS, paddingRight: 55, border: regForm.confirm_password && regForm.password !== regForm.confirm_password ? "1.5px solid #f43f5e" : IS.border }} />
                        <button type="button" onClick={() => setShowCPw(!showCPw)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: 0, color: "#38bdf8", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{showCPw ? "HIDE" : "SHOW"}</button>
                      </div>
                    </FG>
                  </div>
                  <div style={{ background: "rgba(56,189,248,0.05)", border: "1px solid rgba(56,189,248,0.15)", borderRadius: 8, padding: "9px 12px", marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#38bdf8", marginBottom: 5 }}>🔒 PASSWORD STRENGTH</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
                      {[["8+ chars", regForm.password.length >= 8], ["Uppercase", /[A-Z]/.test(regForm.password)], ["Number", /\d/.test(regForm.password)], ["Symbol", /[^A-Za-z0-9]/.test(regForm.password)]].map(([t, ok]) => (
                        <span key={t} style={{ fontSize: 11, color: ok ? "#10b981" : "rgba(255,255,255,0.3)" }}>{ok ? "✓" : "○"} {t}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button type="button" onClick={() => { setErr(""); setRegStep(1); }} style={GB}>← Back</button>
                    <button id="reg-step2-next" type="submit" disabled={busy} style={{ ...PB, flex: 1 }}>CONTINUE: Contact Info →</button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 3: Contact Info */}
            {regStep === 3 && (
              <div style={{ padding: "22px 28px 28px" }} className="animate-fade-in">
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Contact Information</h3>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 18 }}>We'll send verification codes to your email and mobile phone.</p>
                <form onSubmit={step3}>
                  <FG label="Email Address *">
                    <input id="reg-email" type="email" value={regForm.email} onChange={e => setRegForm({ ...regForm, email: e.target.value })} placeholder="name@example.com" required style={IS} />
                  </FG>
                  <FG label="Mobile Phone Number *">
                    <input id="reg-phone" type="tel" value={regForm.phone} onChange={e => setRegForm({ ...regForm, phone: e.target.value })} placeholder="+1 (XXX) XXX-XXXX" required style={IS} />
                  </FG>
                  <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "9px 12px", marginBottom: 18 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#10b981", marginBottom: 3 }}>📋 NEXT STEP</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>A 6-digit OTP code will be sent simultaneously to your email and SMS for identity verification.</div>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button type="button" onClick={() => { setErr(""); setRegStep(2); }} style={GB}>← Back</button>
                    <button id="reg-step3-submit" type="submit" disabled={busy} style={{ ...PB, flex: 1 }}>{busy ? "Sending OTP…" : "SEND VERIFICATION CODE →"}</button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 4: OTP Verification */}
            {regStep === 4 && (
              <div style={{ padding: "16px 28px 20px", textAlign: "center", maxWidth: 520, margin: "0 auto" }} className="animate-fade-in">
                {/* Compact header row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(56,189,248,0.12)", border: "2px solid #38bdf8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, boxShadow: "0 0 16px rgba(56,189,248,0.3)" }}>✉️</div>
                  <div style={{ textAlign: "left" }}>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>Verify Your Identity</h3>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: 0 }}>Enter the 6-digit code sent to your contacts below</p>
                  </div>
                </div>

                {/* Contact info — compact inline */}
                <div style={{ background: "rgba(0,0,0,0.28)", borderRadius: 8, padding: "7px 14px", marginBottom: 14, display: "flex", justifyContent: "center", gap: 20, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ fontSize: 11, color: "#fff" }}>📧 <strong>{otpInfo.masked_email}</strong></span>
                  <span style={{ fontSize: 11, color: "#fff" }}>📱 <strong>{otpInfo.masked_phone}</strong></span>
                </div>

                {/* Demo code banner — PROMINENT so user can't miss it */}
                {otpInfo.preview && (
                  <div
                    onClick={() => setOtpDigits(otpInfo.preview.split(""))}
                    style={{ background: "rgba(16,185,129,0.15)", border: "1.5px solid rgba(16,185,129,0.5)", borderRadius: 9, padding: "9px 14px", marginBottom: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "background 0.2s" }}
                  >
                    <span style={{ fontSize: 15 }}>⚡</span>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 11, color: "#10b981", fontWeight: 700 }}>DEMO — Click to auto-fill the code</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: "#34d399", fontFamily: "monospace", letterSpacing: "2px" }}>{otpInfo.preview}</div>
                    </div>
                    <div style={{ marginLeft: "auto", background: "rgba(16,185,129,0.3)", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#34d399" }}>AUTO-FILL →</div>
                  </div>
                )}

                <form onSubmit={verifyOtp}>
                  {/* OTP boxes */}
                  <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 12 }} onPaste={otpPaste}>
                    {otpDigits.map((d, i) => (
                      <input key={i} ref={el => (otpRefs.current[i] = el)} type="text" inputMode="numeric" maxLength={1} value={d}
                        onChange={e => otpChange(i, e.target.value)} onKeyDown={e => otpKey(i, e)}
                        style={{ width: 46, height: 52, textAlign: "center", fontSize: 22, fontWeight: 800, background: "rgba(0,0,0,0.5)", border: d ? "2px solid #38bdf8" : "2px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", outline: "none", transition: "border 0.15s" }} />
                    ))}
                  </div>

                  {/* Resend row */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Didn't receive the code?</span>
                    <button type="button" onClick={resend} disabled={resendCD > 0 || busy} style={{ background: "transparent", border: 0, color: resendCD > 0 ? "rgba(255,255,255,0.25)" : "#38bdf8", fontSize: 11, fontWeight: 700, cursor: resendCD > 0 ? "default" : "pointer" }}>{resendCD > 0 ? `Resend in ${resendCD}s` : "Resend Code"}</button>
                  </div>

                  <button id="reg-verify-otp" type="submit" disabled={busy || otpDigits.join("").length !== 6}
                    style={{ ...PB, opacity: otpDigits.join("").length !== 6 ? 0.45 : 1, cursor: otpDigits.join("").length !== 6 ? "not-allowed" : "pointer" }}>
                    {busy ? "Verifying…" : otpDigits.join("").length !== 6 ? "Enter all 6 digits above first" : "VERIFY & CONTINUE TO FACE ID →"}
                  </button>
                </form>
              </div>
            )}

            {/* Step 5: Face ID Enrollment */}
            {regStep === 5 && (
              <div style={{ padding: "22px 28px 28px" }} className="animate-fade-in">
                {enrollStep < 4 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26, alignItems: "center" }}>
                    <div style={{ textAlign: "center" }}>
                      <HumanVisionDetector activeDirection={DIRECTIONS[enrollStep].id} stepIndex={enrollStep} label={DIRECTIONS[enrollStep].label} size={300} />
                      <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Frame your face within the reticle and follow the guidance.</div>
                    </div>
                    <div>
                      <h4 style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Register Biometric Face ID</h4>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 14 }}>Complete 4 directional captures to map your 3D face geometry and prevent spoofing.</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 16 }}>
                        {DIRECTIONS.map((dir, idx) => {
                          const isDone = completedDirs.includes(dir.id);
                          const isCur = enrollStep === idx;
                          return (
                            <div key={dir.id} style={{ padding: "9px 12px", borderRadius: 10, background: isCur ? "rgba(56,189,248,0.12)" : isDone ? "rgba(16,185,129,0.09)" : "rgba(0,0,0,0.22)", border: isCur ? "1.5px solid #38bdf8" : isDone ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                <span style={{ fontSize: 14 }}>{dir.icon}</span>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: isCur ? "#fff" : isDone ? "#34d399" : "rgba(255,255,255,0.35)" }}>{dir.title}</div>
                                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.22)", lineHeight: 1.4 }}>{dir.instruction}</div>
                                </div>
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 800, color: isDone ? "#34d399" : isCur ? "#38bdf8" : "rgba(255,255,255,0.2)" }}>{isDone ? "✓ Done" : isCur ? "Active" : "Pending"}</span>
                            </div>
                          );
                        })}
                      </div>
                      <button id="reg-capture-pose" type="button" onClick={captureDir} disabled={busy} style={{ ...PB, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <span>📷</span>
                        {enrollStep === 0 && "CONFIRM CENTER POSE (1/4) →"}
                        {enrollStep === 1 && "CONFIRM LEFT POSE (2/4) →"}
                        {enrollStep === 2 && "CONFIRM RIGHT POSE (3/4) →"}
                        {enrollStep === 3 && "COMPLETE BIOMETRIC CAPTURE (4/4) ✓"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <div style={{ width: 70, height: 70, borderRadius: "50%", background: "rgba(16,185,129,0.2)", border: "2px solid #10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, margin: "0 auto 12px", boxShadow: "0 0 30px rgba(16,185,129,0.4)" }}>✓</div>
                    <h3 style={{ fontSize: 20, fontWeight: 800, color: "#34d399" }}>Face ID Enrolled Successfully!</h3>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 8 }}>Generating your banking profile…</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 6: Banking Profile Summary */}
            {regStep === 6 && (
              <div style={{ padding: "22px 28px 32px" }} className="animate-fade-in">
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{ width: 70, height: 70, borderRadius: "50%", background: "linear-gradient(135deg, rgba(16,185,129,0.25), rgba(56,189,248,0.2))", border: "2px solid #10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, margin: "0 auto 12px", boxShadow: "0 0 35px rgba(16,185,129,0.4)" }}>🏦</div>
                  <h3 style={{ fontSize: 21, fontWeight: 800, color: "#34d399", marginBottom: 4 }}>Account Created Successfully!</h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>Welcome to Risk Shield Banking, <strong style={{ color: "#fff" }}>{regForm.full_name}</strong>. Your banking profile is ready.</p>
                </div>

                <div style={{ background: "linear-gradient(135deg, rgba(2,132,199,0.15), rgba(16,185,129,0.08))", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 14, padding: "18px 20px", marginBottom: 18, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #0284c7, #38bdf8, #10b981)" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 18 }}>🛡️</span>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>Risk Shield Banking Network</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{bankProfile?.account_type || "Advantage Checking"} Account</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
                    {[
                      { label: "Customer ID", value: bankProfile?.customer_id || "RS————", icon: "🪪" },
                      { label: "Account Status", value: "✅ ACTIVE", icon: "📋" },
                      { label: "Account Number", value: bankProfile?.account_number ? `•••• •••• ${bankProfile.account_number.slice(-4)}` : "••••", icon: "💳" },
                      { label: "Routing Number", value: bankProfile?.routing_number ? `${bankProfile.routing_number.slice(0,3)} ${bankProfile.routing_number.slice(3,6)} ${bankProfile.routing_number.slice(6)}` : "999 ———", icon: "🏛️" },
                      { label: "Account Type", value: "Advantage Checking", icon: "🏦" },
                      { label: "Opening Balance", value: "$0.00", icon: "💰" }
                    ].map(item => (
                      <div key={item.label} style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "10px 12px" }}>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{item.icon} {item.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", fontFamily: "monospace" }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 7, padding: "6px 10px" }}>
                    <div style={{ fontSize: 9, color: "#fbbf24", fontWeight: 700 }}>⚠️ FICTIONAL BANKING DEMO — Not real banking credentials</div>
                  </div>
                </div>

                <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "11px 14px", marginBottom: 18, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 9 }}>📋 Registration Summary</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 18px" }}>
                    {[["Full Name", regForm.full_name], ["User ID", regForm.user_id || otpInfo.user_id], ["Email", otpInfo.masked_email], ["Phone", otpInfo.masked_phone], ["Address", regForm.city ? `${regForm.city}, ${regForm.state}` : "On file"], ["Face ID", "✓ 4-direction enrolled"]].map(([k, v]) => (
                      <div key={k}><span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 700 }}>{k}: </span><span style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>{v}</span></div>
                    ))}
                  </div>
                </div>

                <button id="reg-go-dashboard" type="button" onClick={finishReg} disabled={busy} style={{ ...PB, padding: "15px", fontSize: 15, background: "linear-gradient(135deg, #10b981, #0284c7)", boxShadow: "0 0 30px rgba(16,185,129,0.4)" }}>
                  {busy ? "Signing In…" : "🚀 GO TO BANKING DASHBOARD →"}
                </button>
              </div>
            )}

            {regStep <= 3 && (
              <div style={{ textAlign: "center", padding: "0 28px 12px" }}>
                <button type="button" onClick={() => { setErr(""); setMode("login"); }} style={{ background: "transparent", border: 0, color: "rgba(255,255,255,0.3)", fontSize: 12, cursor: "pointer" }}>Already have an account? Sign In →</button>
              </div>
            )}
          </div>
        )}

        {/* ===== FACE ID LOGIN ===== */}
        {mode === "face_login" && (
          <div style={{ padding: "30px 28px 36px", textAlign: "center", maxWidth: 500, margin: "0 auto" }} className="animate-fade-in">
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Face ID Biometric Verification</h3>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 18 }}>Look at your device camera for instant human vision verification.</p>
            <div style={{ marginBottom: 18 }}>
              <HumanVisionDetector activeDirection="center" stepIndex={0} label={faceStat || "Authenticating Face..."} size={260} isScanning={true} />
            </div>
            <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
              <div style={{ width: `${faceProg}%`, height: "100%", background: "linear-gradient(90deg, #38bdf8, #818cf8, #f43f5e)", transition: "width 0.4s ease" }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#38bdf8", marginBottom: 18 }}>{faceStat}</div>
            <button type="button" onClick={() => setMode("login")} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 16px", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer" }}>Cancel / Sign In with Password</button>
          </div>
        )}
      </div>
    </div>
  );
}
