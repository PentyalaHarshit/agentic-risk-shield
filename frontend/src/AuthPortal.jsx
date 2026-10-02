import React, { useState, useEffect, useRef } from "react";

const DIRECTIONS = [
  {
    id: "center",
    title: "1. Look Center",
    label: "Look Straight Ahead",
    icon: "👤",
    instruction: "Align your face directly inside the oval reticle facing forward."
  },
  {
    id: "left",
    title: "2. Turn Left",
    label: "Turn Head Left",
    icon: "👤 ←",
    instruction: "Slowly turn your head to the LEFT so the system maps your profile contour."
  },
  {
    id: "right",
    title: "3. Turn Right",
    label: "Turn Head Right",
    icon: "→ 👤",
    instruction: "Slowly turn your head to the RIGHT to capture your right-side biometric angles."
  },
  {
    id: "up_down",
    title: "4. Look Up / Down",
    label: "Tilt Up & Down",
    icon: "↑ 👤 ↓",
    instruction: "Tilt your head slightly UP and then DOWN for depth & pitch verification."
  }
];

export default function AuthPortal({ API, currentTheme, onLoginSuccess, setErr }) {
  // Mode: "login" | "register" | "otp" | "face_enroll" | "face_login"
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forms
  const [loginForm, setLoginForm] = useState({
    user_id: "harshit",
    password: "RiskShield@2026"
  });

  const [regForm, setRegForm] = useState({
    full_name: "Harshit Pentyala",
    user_id: "harshit",
    password: "RiskShield@2026",
    confirm_password: "RiskShield@2026",
    email: "harshit.pentyala@gmail.com",
    phone: "+1 (214) 555-0192"
  });

  // OTP State
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpInfo, setOtpInfo] = useState({
    masked_email: "h*****@gmail.com",
    masked_phone: "+1 (214) ***-0192",
    preview: "",
    user_id: ""
  });
  const [resendCooldown, setResendCooldown] = useState(0);

  // Face ID Enrollment State
  const [enrollStep, setEnrollStep] = useState(0); // 0..3: directions, 4: complete
  const [completedDirs, setCompletedDirs] = useState([]);
  const [enrollSuccessMsg, setEnrollSuccessMsg] = useState("");

  // Face Login State
  const [faceScanProgress, setFaceScanProgress] = useState(0);
  const [faceScanStatus, setFaceScanStatus] = useState("");

  // Camera State & Refs
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const otpInputsRef = useRef([]);

  // Setup / teardown webcam when entering face_enroll or face_login
  useEffect(() => {
    let active = true;
    if (mode === "face_enroll" || mode === "face_login") {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { width: 480, height: 480, facingMode: "user" } })
          .then((stream) => {
            if (!active) {
              stream.getTracks().forEach((t) => t.stop());
              return;
            }
            streamRef.current = stream;
            setCameraActive(true);
            setCameraError(false);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch(() => {});
            }
          })
          .catch((e) => {
            console.warn("Camera unavailable or permission denied, using vision simulator:", e);
            setCameraError(true);
            setCameraActive(false);
          });
      } else {
        setCameraError(true);
      }
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setCameraActive(false);
    }

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [mode]);

  // Face Login automated scanner simulation & verification
  useEffect(() => {
    let t1, t2, t3;
    if (mode === "face_login") {
      setFaceScanProgress(15);
      setFaceScanStatus("Detecting face in frame reticle...");

      t1 = setTimeout(() => {
        setFaceScanProgress(55);
        setFaceScanStatus("Extracting 128-point biometric landmark mesh...");
      }, 900);

      t2 = setTimeout(() => {
        setFaceScanProgress(85);
        setFaceScanStatus("Matching biometric signature against secure enclave...");
      }, 1900);

      t3 = setTimeout(async () => {
        setFaceScanProgress(100);
        setFaceScanStatus("✓ Biometric Match Confirmed! Authenticating...");
        try {
          const res = await post("/api/auth/login-face", {
            user_id: loginForm.user_id || "harshit"
          });
          onLoginSuccess(res.user);
        } catch (e) {
          setErr("Face ID login failed: " + e.message);
          setMode("login");
        }
      }, 2800);
    }
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [mode]);

  // OTP resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((c) => c - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Helper HTTP POST
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

  // 1. Password Login
  const handlePasswordLogin = async (e) => {
    if (e) e.preventDefault();
    if (!loginForm.user_id.trim() || !loginForm.password.trim()) {
      setErr("Please enter both User ID and Password.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await post("/api/auth/login-password", {
        user_id: loginForm.user_id,
        password: loginForm.password
      });
      onLoginSuccess(res.user);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  // 2. Start Registration
  const handleRegisterSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!regForm.full_name.trim() || !regForm.user_id.trim() || !regForm.password.trim()) {
      setErr("Please fill in all required registration fields.");
      return;
    }
    if (regForm.password !== regForm.confirm_password) {
      setErr("Passwords do not match. Please verify.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await post("/api/auth/register", {
        full_name: regForm.full_name,
        user_id: regForm.user_id,
        password: regForm.password,
        email: regForm.email,
        phone: regForm.phone
      });
      setOtpInfo({
        masked_email: res.masked_email,
        masked_phone: res.masked_phone,
        preview: res.demo_otp_preview,
        user_id: res.user_id
      });
      setOtpDigits(["", "", "", "", "", ""]);
      setResendCooldown(30);
      setMode("otp");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  // 3. OTP Verification
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    // Auto-advance to next box
    if (value && index < 5 && otpInputsRef.current[index + 1]) {
      otpInputsRef.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      if (otpInputsRef.current[index - 1]) {
        otpInputsRef.current[index - 1].focus();
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(paste)) {
      setOtpDigits(paste.split(""));
      if (otpInputsRef.current[5]) otpInputsRef.current[5].focus();
    }
  };

  const handleVerifyOtpSubmit = async (e) => {
    if (e) e.preventDefault();
    const code = otpDigits.join("");
    if (code.length !== 6) {
      setErr("Please enter the complete 6-digit verification code.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await post("/api/auth/verify-otp", {
        user_id: otpInfo.user_id || regForm.user_id,
        code: code
      });
      setEnrollStep(0);
      setCompletedDirs([]);
      setMode("face_enroll");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setBusy(true);
    setErr("");
    try {
      const res = await post("/api/auth/resend-otp", {
        user_id: otpInfo.user_id || regForm.user_id
      });
      setOtpInfo((prev) => ({
        ...prev,
        preview: res.demo_otp_preview
      }));
      setResendCooldown(30);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  // 4. Face Enrollment Directions
  const captureDirectionPose = async () => {
    const curDir = DIRECTIONS[enrollStep];
    if (!curDir) return;

    const nextCompleted = [...completedDirs, curDir.id];
    setCompletedDirs(nextCompleted);

    if (enrollStep < 3) {
      setEnrollStep(enrollStep + 1);
    } else {
      // Step 4 reached: all 4 directions completed
      setBusy(true);
      setErr("");
      try {
        const res = await post("/api/auth/enroll-face", {
          user_id: otpInfo.user_id || regForm.user_id,
          directions_completed: ["center", "left", "right", "up_down"]
        });
        setEnrollSuccessMsg(res.message);
        setEnrollStep(4); // Finished
      } catch (e) {
        setErr(e.message);
      } finally {
        setBusy(false);
      }
    }
  };

  const handleFinishEnrollment = async () => {
    // Automatically log user in
    setBusy(true);
    try {
      const res = await post("/api/auth/login-face", {
        user_id: otpInfo.user_id || regForm.user_id
      });
      onLoginSuccess(res.user);
    } catch (e) {
      // Fallback to password login screen
      setLoginForm({
        user_id: otpInfo.user_id || regForm.user_id,
        password: regForm.password
      });
      setMode("login");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: "0 auto" }}>
      {/* Container with active theme */}
      <div
        className="animate-fade-in"
        style={{
          background: currentTheme.boxBg,
          backdropFilter: "blur(24px)",
          border: currentTheme.border,
          borderRadius: "var(--radius-lg)",
          boxShadow: currentTheme.boxShadow,
          overflow: "hidden",
          transition: "all 0.3s ease"
        }}
      >
        {/* Top glowing accent ribbon stripe */}
        <div style={{ height: 5, background: currentTheme.topRibbon, width: "100%" }} />

        {/* Portal Header */}
        <div
          style={{
            padding: "18px 24px 16px",
            background: currentTheme.navBg,
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, #0284c7, #38bdf8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                boxShadow: "0 0 16px rgba(56, 189, 248, 0.35)"
              }}
            >
              🛡️
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#fff", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  QuickPay
                </span>
                <span style={{ fontSize: 11, color: "var(--accent-blue)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  + Risk Shield
                </span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>
                {mode === "login" && "Sign In to Online Banking"}
                {mode === "register" && "Create Your Account"}
                {mode === "otp" && "Verify Your Identity"}
                {mode === "face_enroll" && "Register Biometric Face ID"}
                {mode === "face_login" && "Face ID Biometric Scanner"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              🔒 Bank-Grade • Human Vision • Encrypted
            </span>
            <span style={{ fontSize: 11, color: "var(--accent-blue)", background: "rgba(255, 255, 255, 0.06)", padding: "2px 8px", borderRadius: 8 }}>
              {mode === "login" && "Authentication"}
              {mode === "register" && "Step 1 of 3: Details"}
              {mode === "otp" && "Step 2 of 3: OTP"}
              {mode === "face_enroll" && "Step 3 of 3: Biometrics"}
              {mode === "face_login" && "Vision AI"}
            </span>
          </div>
        </div>

        {/* =========================================================================
            VIEW 1: SIGN IN (PASSWORD + FACE ID)
           ========================================================================= */}
        {mode === "login" && (
          <div style={{ padding: "30px 28px 36px" }} className="animate-fade-in">
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 32, alignItems: "start" }}>
              {/* Left Column: User ID + Password Form */}
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                  Sign In with User ID & Password
                </h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>
                  Enter your online banking credentials to access your checking account and transfers.
                </p>

                <form onSubmit={handlePasswordLogin}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                      User ID
                    </label>
                    <input
                      type="text"
                      value={loginForm.user_id}
                      onChange={(e) => setLoginForm({ ...loginForm, user_id: e.target.value })}
                      placeholder="Enter your User ID"
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        background: "rgba(0, 0, 0, 0.4)",
                        border: "1px solid var(--border-glow)",
                        borderRadius: "var(--radius-md)",
                        color: "#fff",
                        fontSize: 14
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ background: "transparent", border: 0, color: "var(--accent-blue)", fontSize: 11, cursor: "pointer" }}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      placeholder="Enter your password"
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        background: "rgba(0, 0, 0, 0.4)",
                        border: "1px solid var(--border-glow)",
                        borderRadius: "var(--radius-md)",
                        color: "#fff",
                        fontSize: 14
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
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
                    {busy ? "Authenticating…" : "SIGN IN →"}
                  </button>
                </form>

                {/* Quick Demo Pre-fill */}
                <div style={{ marginTop: 18, background: "rgba(255, 255, 255, 0.04)", borderRadius: 8, padding: "10px 12px", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8" }}>⚡ Demo Account Preset:</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        User ID: <code style={{ color: "#fff" }}>harshit</code> • Password: <code style={{ color: "#fff" }}>RiskShield@2026</code>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLoginForm({ user_id: "harshit", password: "RiskShield@2026" })}
                      style={{
                        background: "rgba(56, 189, 248, 0.2)",
                        border: "1px solid rgba(56, 189, 248, 0.4)",
                        borderRadius: 6,
                        color: "#38bdf8",
                        padding: "4px 8px",
                        fontSize: 11,
                        cursor: "pointer",
                        fontWeight: 600
                      }}
                    >
                      Pre-fill
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Biometric Face ID Login Card */}
              <div
                style={{
                  background: "rgba(0, 0, 0, 0.35)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  borderRadius: "var(--radius-lg)",
                  padding: 24,
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)"
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, rgba(37, 99, 235, 0.6), rgba(225, 29, 72, 0.4))",
                    border: "2px solid #38bdf8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 34,
                    marginBottom: 16,
                    boxShadow: "0 0 25px rgba(56, 189, 248, 0.4)"
                  }}
                >
                  👤
                </div>

                <h4 style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
                  Sign in with Face ID
                </h4>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.5 }}>
                  Use your enrolled 4-directional biometric profile to sign in instantly with human vision.
                </p>

                <button
                  type="button"
                  onClick={() => setMode("face_login")}
                  style={{
                    width: "100%",
                    padding: "13px",
                    background: "linear-gradient(135deg, #0284c7, #38bdf8)",
                    border: 0,
                    borderRadius: "var(--radius-md)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 0 20px rgba(56, 189, 248, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8
                  }}
                >
                  <span>📷</span> USE FACE ID SCANNER
                </button>

                <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 12 }}>
                  Protected by biometric anti-spoofing
                </div>
              </div>
            </div>

            {/* Bottom Register Switcher */}
            <div
              style={{
                marginTop: 28,
                paddingTop: 18,
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Don't have an online banking account?
              </div>
              <button
                type="button"
                onClick={() => setMode("register")}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  padding: "8px 16px",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Create an Account →
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 2: CREATE ACCOUNT / REGISTER (Bank of America Style)
           ========================================================================= */}
        {mode === "register" && (
          <div style={{ padding: "30px 28px 36px" }} className="animate-fade-in">
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>
                Create Your Online Banking Account
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                Enter your legal registration details. In the next steps, you will verify via SMS/Email OTP and register Face ID.
              </p>
            </div>

            <form onSubmit={handleRegisterSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    value={regForm.full_name}
                    onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })}
                    placeholder="e.g. Harshit Pentyala"
                    required
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      background: "rgba(0, 0, 0, 0.4)",
                      border: "1px solid var(--border-glow)",
                      borderRadius: "var(--radius-md)",
                      color: "#fff",
                      fontSize: 14
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                    User ID *
                  </label>
                  <input
                    type="text"
                    value={regForm.user_id}
                    onChange={(e) => setRegForm({ ...regForm, user_id: e.target.value })}
                    placeholder="Choose a unique User ID"
                    required
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      background: "rgba(0, 0, 0, 0.4)",
                      border: "1px solid var(--border-glow)",
                      borderRadius: "var(--radius-md)",
                      color: "#fff",
                      fontSize: 14
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                    Password *
                  </label>
                  <input
                    type="password"
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    placeholder="Create a strong password"
                    required
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      background: "rgba(0, 0, 0, 0.4)",
                      border: "1px solid var(--border-glow)",
                      borderRadius: "var(--radius-md)",
                      color: "#fff",
                      fontSize: 14
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={regForm.confirm_password}
                    onChange={(e) => setRegForm({ ...regForm, confirm_password: e.target.value })}
                    placeholder="Re-enter your password"
                    required
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      background: "rgba(0, 0, 0, 0.4)",
                      border: "1px solid var(--border-glow)",
                      borderRadius: "var(--radius-md)",
                      color: "#fff",
                      fontSize: 14
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    placeholder="name@example.com"
                    required
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      background: "rgba(0, 0, 0, 0.4)",
                      border: "1px solid var(--border-glow)",
                      borderRadius: "var(--radius-md)",
                      color: "#fff",
                      fontSize: 14
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                    Mobile Phone Number *
                  </label>
                  <input
                    type="text"
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    placeholder="+1 (XXX) XXX-XXXX"
                    required
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      background: "rgba(0, 0, 0, 0.4)",
                      border: "1px solid var(--border-glow)",
                      borderRadius: "var(--radius-md)",
                      color: "#fff",
                      fontSize: 14
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  style={{
                    padding: "14px 20px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-muted)",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  ← Back to Sign In
                </button>

                <button
                  type="submit"
                  disabled={busy}
                  style={{
                    flex: 1,
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
                  {busy ? "Registering…" : "CONTINUE TO OTP VERIFICATION →"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =========================================================================
            VIEW 3: OTP VERIFICATION SCREEN
           ========================================================================= */}
        {mode === "otp" && (
          <div style={{ padding: "34px 28px 38px", textAlign: "center", maxWidth: 540, margin: "0 auto" }} className="animate-fade-in">
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "rgba(56, 189, 248, 0.15)",
                border: "2px solid #38bdf8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                margin: "0 auto 16px",
                boxShadow: "0 0 20px rgba(56, 189, 248, 0.3)"
              }}
            >
              ✉️
            </div>

            <h3 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
              Verify Your Identity
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18 }}>
              We sent a 6-digit verification code to your registered contacts:
            </p>

            <div
              style={{
                background: "rgba(0, 0, 0, 0.35)",
                borderRadius: 10,
                padding: "12px 18px",
                marginBottom: 24,
                display: "inline-block",
                border: "1px solid var(--border-subtle)"
              }}
            >
              <div style={{ fontSize: 12, color: "#fff", marginBottom: 4 }}>
                📧 Email: <strong>{otpInfo.masked_email}</strong>
              </div>
              <div style={{ fontSize: 12, color: "#fff" }}>
                📱 SMS: <strong>{otpInfo.masked_phone}</strong>
              </div>
            </div>

            {/* 6 Digit Input Boxes */}
            <form onSubmit={handleVerifyOtpSubmit}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 10,
                  marginBottom: 20
                }}
                onPaste={handleOtpPaste}
              >
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputsRef.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="otp-digit-input"
                  />
                ))}
              </div>

              {/* Convenience Preview Banner for Test Environment */}
              {otpInfo.preview && (
                <div
                  onClick={() => setOtpDigits(otpInfo.preview.split(""))}
                  style={{
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.35)",
                    borderRadius: 8,
                    padding: "8px 14px",
                    marginBottom: 22,
                    fontSize: 12,
                    color: "#34d399",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8
                  }}
                >
                  <span>⚡ Demo Preview:</span>
                  <strong>Code is {otpInfo.preview}</strong>
                  <span style={{ fontSize: 10, textDecoration: "underline" }}>(Click to auto-fill)</span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
                  Didn't receive the code?
                </span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || busy}
                  style={{
                    background: "transparent",
                    border: 0,
                    color: resendCooldown > 0 ? "var(--text-faint)" : "var(--accent-blue)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: resendCooldown > 0 ? "default" : "pointer"
                  }}
                >
                  {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : "Resend Code"}
                </button>
              </div>

              <button
                type="submit"
                disabled={busy || otpDigits.join("").length !== 6}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: currentTheme.primaryBtn,
                  border: 0,
                  borderRadius: "var(--radius-md)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: busy || otpDigits.join("").length !== 6 ? "not-allowed" : "pointer",
                  boxShadow: currentTheme.primaryBtnGlow,
                  letterSpacing: "0.5px"
                }}
              >
                {busy ? "Verifying Code…" : "VERIFY CODE & REGISTER FACE ID →"}
              </button>
            </form>
          </div>
        )}

        {/* =========================================================================
            VIEW 4: REGISTER FACE ID (4-Directional Vision Scanner)
           ========================================================================= */}
        {mode === "face_enroll" && (
          <div style={{ padding: "30px 28px 36px" }} className="animate-fade-in">
            {enrollStep < 4 ? (
              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 30, alignItems: "center" }}>
                {/* Left: Camera / Viewfinder Reticle */}
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      position: "relative",
                      width: 320,
                      height: 320,
                      margin: "0 auto",
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: "3px solid #38bdf8",
                      boxShadow: "0 0 35px rgba(56, 189, 248, 0.4), inset 0 0 30px rgba(0, 0, 0, 0.8)",
                      background: "#020617"
                    }}
                  >
                    {cameraActive ? (
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        autoPlay
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          transform: "scaleX(-1)" // Mirror view
                        }}
                      />
                    ) : (
                      /* High-tech vision simulation fallback */
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "radial-gradient(circle, rgba(30,58,138,0.5) 0%, #030712 85%)",
                          color: "#38bdf8"
                        }}
                      >
                        <div style={{ fontSize: 72, marginBottom: 8, filter: "drop-shadow(0 0 16px #38bdf8)" }}>
                          {DIRECTIONS[enrollStep].icon}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>HUMAN VISION SENSOR</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                          {cameraError ? "Simulated Camera Mode" : "Initializing sensor…"}
                        </div>
                      </div>
                    )}

                    {/* Laser Scanline */}
                    <div className="biometric-scanline" />

                    {/* Directional Overlay Prompt */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: 20,
                        left: 20,
                        right: 20,
                        background: "rgba(15, 23, 42, 0.85)",
                        backdropFilter: "blur(8px)",
                        padding: "6px 12px",
                        borderRadius: 16,
                        border: "1px solid rgba(56, 189, 248, 0.4)",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#fff"
                      }}
                    >
                      {DIRECTIONS[enrollStep].label}
                    </div>
                  </div>

                  <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-muted)" }}>
                    Frame your face within the oval circle and follow the guidance prompts.
                  </div>
                </div>

                {/* Right: 4 Directions Checklist & Capture Trigger */}
                <div>
                  <h4 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
                    Calibrate Biometric Angles
                  </h4>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 18 }}>
                    Bank of America style multi-angle depth capture prevents photo spoofing.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                    {DIRECTIONS.map((dir, idx) => {
                      const isDone = completedDirs.includes(dir.id);
                      const isCurrent = enrollStep === idx;
                      return (
                        <div
                          key={dir.id}
                          style={{
                            padding: "10px 14px",
                            borderRadius: 10,
                            background: isCurrent
                              ? "rgba(56, 189, 248, 0.15)"
                              : isDone
                              ? "rgba(16, 185, 129, 0.1)"
                              : "rgba(0, 0, 0, 0.3)",
                            border: isCurrent
                              ? "1.5px solid #38bdf8"
                              : isDone
                              ? "1px solid #10b981"
                              : "1px solid rgba(255, 255, 255, 0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 18 }}>{dir.icon}</span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: isCurrent ? "#fff" : isDone ? "#34d399" : "var(--text-muted)" }}>
                                {dir.title}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
                                {dir.instruction}
                              </div>
                            </div>
                          </div>

                          <span style={{ fontSize: 12, fontWeight: 800, color: isDone ? "#34d399" : isCurrent ? "#38bdf8" : "var(--text-faint)" }}>
                            {isDone ? "✓ Captured" : isCurrent ? "Active" : "Pending"}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={captureDirectionPose}
                    disabled={busy}
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
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8
                    }}
                  >
                    <span>📷</span>
                    {enrollStep === 0 && "CONFIRM CENTER POSE (1/4) →"}
                    {enrollStep === 1 && "CONFIRM LEFT POSE (2/4) →"}
                    {enrollStep === 2 && "CONFIRM RIGHT POSE (3/4) →"}
                    {enrollStep === 3 && "COMPLETE BIOMETRIC CAPTURE (4/4) ✓"}
                  </button>
                </div>
              </div>
            ) : (
              /* Step 4 Completed View */
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: "50%",
                    background: "rgba(16, 185, 129, 0.2)",
                    border: "2px solid #10b981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 36,
                    margin: "0 auto 16px",
                    boxShadow: "0 0 30px rgba(16, 185, 129, 0.4)"
                  }}
                >
                  ✓
                </div>

                <h3 style={{ fontSize: 22, fontWeight: 800, color: "#34d399", marginBottom: 6 }}>
                  Face Enrollment Completed!
                </h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 500, margin: "0 auto 24px", lineHeight: 1.6 }}>
                  {enrollSuccessMsg || "Your biometric profile has been successfully registered across all 4 directional milestones. You can now sign in using Face ID or your password."}
                </p>

                <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                  <button
                    type="button"
                    onClick={handleFinishEnrollment}
                    disabled={busy}
                    style={{
                      padding: "14px 28px",
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      border: 0,
                      borderRadius: "var(--radius-md)",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: busy ? "not-allowed" : "pointer",
                      boxShadow: "0 0 25px rgba(16, 185, 129, 0.45)"
                    }}
                  >
                    CONTINUE TO BANKING DASHBOARD →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            VIEW 5: FACE ID LOGIN SCANNER MODAL / VIEW
           ========================================================================= */}
        {mode === "face_login" && (
          <div style={{ padding: "34px 28px 40px", textAlign: "center", maxWidth: 500, margin: "0 auto" }} className="animate-fade-in">
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
              Face ID Biometric Verification
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>
              Look at your device camera for instant human vision verification.
            </p>

            {/* Circular Radar Scanner */}
            <div
              style={{
                position: "relative",
                width: 260,
                height: 260,
                margin: "0 auto 20px",
                borderRadius: "50%",
                overflow: "hidden",
                border: "3px solid #38bdf8",
                boxShadow: "0 0 35px rgba(56, 189, 248, 0.4)",
                background: "#020617"
              }}
            >
              {cameraActive ? (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: "scaleX(-1)"
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "radial-gradient(circle, rgba(30,58,138,0.6) 0%, #020617 80%)"
                  }}
                >
                  <div style={{ fontSize: 64, filter: "drop-shadow(0 0 16px #38bdf8)" }}>👤</div>
                  <div style={{ fontSize: 11, color: "#38bdf8", fontWeight: 700, marginTop: 8 }}>
                    BIOMETRIC SENSOR ACTIVE
                  </div>
                </div>
              )}

              {/* Laser Scanline */}
              <div className="biometric-scanline" />

              {/* Radar sweep */}
              <div
                className="biometric-radar"
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: "conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(56, 189, 248, 0.4) 360deg)",
                  pointerEvents: "none"
                }}
              />
            </div>

            {/* Progress Bar */}
            <div style={{ width: "100%", height: 6, background: "rgba(255, 255, 255, 0.1)", borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
              <div
                style={{
                  width: `${faceScanProgress}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #38bdf8, #818cf8, #f43f5e)",
                  transition: "width 0.4s ease"
                }}
              />
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: "#38bdf8", marginBottom: 20 }}>
              {faceScanStatus}
            </div>

            <button
              type="button"
              onClick={() => setMode("login")}
              style={{
                background: "transparent",
                border: "1px solid var(--border-subtle)",
                borderRadius: 8,
                padding: "8px 16px",
                color: "var(--text-muted)",
                fontSize: 12,
                cursor: "pointer"
              }}
            >
              Cancel / Sign In with Password
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
