import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API || "http://localhost:8000";

export default function ResearchPortal({ onSwitchToCustomer }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [problemData, setProblemData] = useState(null);
  const [datasetData, setDatasetData] = useState(null);
  const [baselineData, setBaselineData] = useState(null);
  const [expAData, setExpAData] = useState(null);
  const [ablationData, setAblationData] = useState(null);
  const [ragData, setRagData] = useState(null);
  const [cppData, setCppData] = useState(null);
  const [failureData, setFailureData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [benchmarkingCpp, setBenchmarkingCpp] = useState(false);

  // Adaptive threshold sliders
  const [costFp, setCostFp] = useState(10);
  const [costFn, setCostFn] = useState(180);
  const [costFriction, setCostFriction] = useState(1.5);
  const [thresholdRes, setThresholdRes] = useState(null);
  const [optimizingThresholds, setOptimizingThresholds] = useState(false);

  // Selected failure case for modal/deep dive
  const [selectedFailure, setSelectedFailure] = useState(null);

  // Initial fetch of problem, dataset, and baseline overviews
  useEffect(() => {
    fetch(`${API}/api/research/problem`)
      .then((r) => r.json())
      .then(setProblemData)
      .catch(() => {});

    fetch(`${API}/api/research/dataset`)
      .then((r) => r.json())
      .then(setDatasetData)
      .catch(() => {});

    fetch(`${API}/api/research/baselines`)
      .then((r) => r.json())
      .then((d) => {
        setBaselineData(d);
        setExpAData(d.controlled_experiment_a);
      })
      .catch(() => {});
  }, []);

  // Fetch tab-specific data on demand
  useEffect(() => {
    if (activeTab === "thresholds" && !thresholdRes) {
      runThresholdOptimization(costFp, costFn, costFriction);
    } else if (activeTab === "ablation" && !ablationData) {
      setLoading(true);
      fetch(`${API}/api/research/ablation`)
        .then((r) => r.json())
        .then((d) => setAblationData(d))
        .finally(() => setLoading(false));
    } else if (activeTab === "rag" && !ragData) {
      setLoading(true);
      fetch(`${API}/api/research/rag-eval`)
        .then((r) => r.json())
        .then((d) => setRagData(d))
        .finally(() => setLoading(false));
    } else if (activeTab === "cpp" && !cppData) {
      runCppBenchmark();
    } else if (activeTab === "failures" && !failureData) {
      setLoading(true);
      fetch(`${API}/api/research/failure-analysis`)
        .then((r) => r.json())
        .then((d) => {
          setFailureData(d);
          if (d.cases && d.cases.length > 0) setSelectedFailure(d.cases[0]);
        })
        .finally(() => setLoading(false));
    }
  }, [activeTab]);

  const runThresholdOptimization = (fp, fn, frict) => {
    setOptimizingThresholds(true);
    fetch(`${API}/api/research/optimize-thresholds?cost_fp=${fp}&cost_fn=${fn}&cost_friction=${frict}`)
      .then((r) => r.json())
      .then((d) => setThresholdRes(d))
      .catch(() => {})
      .finally(() => setOptimizingThresholds(false));
  };

  const runCppBenchmark = () => {
    setBenchmarkingCpp(true);
    fetch(`${API}/api/research/cpp-benchmark`)
      .then((r) => r.json())
      .then((d) => setCppData(d))
      .catch(() => {})
      .finally(() => setBenchmarkingCpp(false));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Research Header Banner */}
      <div style={{
        background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))",
        border: "1px solid rgba(56, 189, 248, 0.3)",
        borderRadius: 16,
        padding: "24px 28px",
        boxShadow: "0 12px 30px rgba(0, 0, 0, 0.4)",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{
          position: "absolute",
          top: -20,
          right: -20,
          width: 180,
          height: 180,
          background: "radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none"
        }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
          <div style={{ maxWidth: 840 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{
                background: "linear-gradient(135deg, #0284c7, #2563eb)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "3px 10px",
                borderRadius: 20
              }}>
                Peer-Review Research Workbench
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                Hypothesis-Driven Agentic AI Framework
              </span>
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 10px", letterSpacing: "-0.01em" }}>
              A Two-Stage Agentic Risk Assessment Framework for Real-Time Financial Transactions
            </h2>

            <div style={{
              background: "rgba(14, 165, 233, 0.08)",
              borderLeft: "3px solid #38bdf8",
              padding: "10px 14px",
              borderRadius: "0 8px 8px 0",
              marginBottom: 14
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Central Research Question:
              </span>
              <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 600, color: "#f1f5f9", fontStyle: "italic" }}>
                "Can a two-stage adaptive transaction-risk system reduce unnecessary customer verification while maintaining strong risk-detection performance?"
              </p>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Evaluating adaptive routing, multi-agent evidence fusion, data-driven cost thresholds, SHAP explainability, RAG policy grounding, and C++ multithreaded stream ingestion against 5 comparative ML baselines.
            </p>
          </div>

          <button
            onClick={onSwitchToCustomer}
            style={{
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              color: "#fff",
              border: 0,
              padding: "10px 18px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 15px rgba(99, 102, 241, 0.35)"
            }}
          >
            <span>📱</span> Try Live in Banking App
          </button>
        </div>

        {/* Sub-navigation tabs */}
        <div style={{
          display: "flex",
          gap: 6,
          marginTop: 24,
          paddingTop: 16,
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          overflowX: "auto"
        }}>
          {[
            { id: "overview", label: "🏛️ Framework Architecture" },
            { id: "baselines", label: "📊 ML Baselines (5 Models)" },
            { id: "experiments", label: "🧪 Controlled Experiment A" },
            { id: "thresholds", label: "🎯 Adaptive Cost Thresholds" },
            { id: "ablation", label: "🔬 Component Ablation Study" },
            { id: "rag", label: "📚 Measurable RAG Evaluation" },
            { id: "cpp", label: "⚡ C++ Multithreading Benchmark" },
            { id: "failures", label: "⚠️ Failure Mode Analysis" },
            { id: "dataset", label: "💾 Benchmark Dataset (10k)" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: 0,
                background: activeTab === tab.id ? "rgba(56, 189, 248, 0.2)" : "transparent",
                color: activeTab === tab.id ? "#38bdf8" : "var(--text-muted)",
                fontSize: 12,
                fontWeight: activeTab === tab.id ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                borderBottom: activeTab === tab.id ? "2px solid #38bdf8" : "2px solid transparent",
                transition: "all 0.15s ease"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tab Content */}
      <div style={{ minHeight: 450 }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>⏳</div>
            Evaluating test dataset & running research benchmark...
          </div>
        )}

        {/* TAB 1: FRAMEWORK ARCHITECTURE & OVERVIEW */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Core Contributions */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {[
                {
                  badge: "Contribution 1",
                  title: "Adaptive Two-Stage Risk Routing",
                  desc: "Low-risk transactions (~78%) avoid unnecessary friction with sub-millisecond screening, while suspicious transactions receive deeper forensic inspection.",
                  icon: "⚡"
                },
                {
                  badge: "Contribution 2",
                  title: "Multi-Agent Evidence Fusion",
                  desc: "Transaction, Communication, Relationship, and History signals are independently gathered by specialized agents, resolving inter-agent disagreement before ML calibration.",
                  icon: "🤖"
                },
                {
                  badge: "Contribution 3",
                  title: "Human-Grounded Decision Pipeline",
                  desc: "Calibrated ML + SHAP XAI + RAG compliance policies + human review loop eliminate uncontrolled LLM decision hallucinations in financial infrastructure.",
                  icon: "🛡️"
                }
              ].map((c, i) => (
                <div key={i} style={{
                  background: "rgba(15, 23, 42, 0.75)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 12,
                  padding: 20
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", textTransform: "uppercase" }}>{c.badge}</span>
                    <span style={{ fontSize: 22 }}>{c.icon}</span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>{c.title}</h3>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>{c.desc}</p>
                </div>
              ))}
            </div>

            {/* Architecture Separation Diagram */}
            <div style={{
              background: "rgba(15, 23, 42, 0.85)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 14,
              padding: 24
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>
                Architectural Separation: Identity Platform vs. Risk Research Engine
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 20px" }}>
                Authentication establishes customer identity; the research engine evaluates transaction risk adaptively.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 20, alignItems: "center" }}>
                {/* Auth Pillar */}
                <div style={{
                  background: "rgba(30, 41, 59, 0.6)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  borderRadius: 12,
                  padding: 18
                }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#a855f7", textTransform: "uppercase", marginBottom: 10 }}>
                    🔒 Authentication Module
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#cbd5e1", lineHeight: 1.8 }}>
                    <li>6-Step Bank of America Style Registration</li>
                    <li>Dual-Channel OTP (Email & SMS)</li>
                    <li>Biometric 4-Direction Face ID Capture</li>
                    <li>Simulated Fictional Routing & Account Ledger</li>
                    <li>JWT Session Management</li>
                  </ul>
                </div>

                <div style={{ fontSize: 24, color: "#64748b" }}>➔</div>

                {/* Research Engine Pillar */}
                <div style={{
                  background: "rgba(14, 165, 233, 0.08)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  borderRadius: 12,
                  padding: 18
                }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#38bdf8", textTransform: "uppercase", marginBottom: 10 }}>
                    🧠 Core Risk Shield Research Engine
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#e2e8f0", lineHeight: 1.8 }}>
                    <li>Stage 1: Adaptive Screening (XGBoost + Cost Corridors)</li>
                    <li>Stage 2: Specialized Agent Swarm (Tx, Comm, Rel, Hist)</li>
                    <li>Evidence Aggregator & Disagreement Detection</li>
                    <li>Rigorous SHAP TreeExplainer Local Attribution</li>
                    <li>RAG Banking Policy Grounding + Human Review</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* End-to-End Visual Workflow */}
            <div style={{
              background: "rgba(15, 23, 42, 0.85)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 14,
              padding: 24
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 16px" }}>
                Complete Decision Pipeline: From Ingestion to Human Review
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(0,0,0,0.25)", padding: 12, borderRadius: 8 }}>
                  <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>1</span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: "#fff" }}>Ingestion & Stage 1 ML:</strong> High-throughput C++ ingestion feeds Stage 1 XGBoost model to evaluate baseline transaction parameters.
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(0,0,0,0.25)", padding: 12, borderRadius: 8 }}>
                  <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>2</span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: "#fff" }}>Data-Driven Adaptive Routing:</strong> Below &theta;<sub>low</sub> (&lt; 0.18): Auto-Approve (78% friction saved). Above &theta;<sub>high</sub> (&ge; 0.72): Auto-Block. Middle corridor: Route to Stage 2.
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(0,0,0,0.25)", padding: 12, borderRadius: 8 }}>
                  <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>3</span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: "#fff" }}>Multi-Agent Evidence Fusion:</strong> Transaction Agent, Communication Agent (social-engineering analysis), Relationship Agent, and History Agent gather domain evidence into structured models.
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(0,0,0,0.25)", padding: 12, borderRadius: 8 }}>
                  <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>4</span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: "#fff" }}>SHAP XAI & Policy Engine:</strong> TreeExplainer calculates exact feature importance; RAG retrieves governing compliance policies; Policy Engine applies guardrails (weak signals cannot BLOCK).
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(0,0,0,0.25)", padding: 12, borderRadius: 8 }}>
                  <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>5</span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: "#fff" }}>Human-in-the-Loop Safety Valve:</strong> Ambiguous or held cases route to the Bank Operations Manager queue with full SHAP attribution, agent evidence, and one-click investigator override.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ML BASELINES (5 COMPARATIVE ARCHITECTURES) */}
        {activeTab === "baselines" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{
              background: "rgba(15, 23, 42, 0.85)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 14,
              padding: 24
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>
                    Machine Learning Baseline Comparison
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                    Evaluated on identical held-out test split (1,500 transactions, 5.95% fraud prevalence).
                  </p>
                </div>
                <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                  Test Set N = 1,500
                </span>
              </div>

              {baselineData && baselineData.baselines && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)", fontSize: 12 }}>
                        <th style={{ padding: "10px 12px" }}>Architecture</th>
                        <th style={{ padding: "10px 12px" }}>Accuracy</th>
                        <th style={{ padding: "10px 12px" }}>Precision</th>
                        <th style={{ padding: "10px 12px" }}>Recall</th>
                        <th style={{ padding: "10px 12px" }}>F1 Score</th>
                        <th style={{ padding: "10px 12px" }}>Verification Rate (Friction)</th>
                        <th style={{ padding: "10px 12px" }}>Avg Latency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {baselineData.baselines.map((b, idx) => {
                        const isProposed = b.name.includes("Proposed");
                        return (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: "1px solid rgba(255,255,255,0.06)",
                              background: isProposed ? "rgba(14, 165, 233, 0.12)" : "transparent",
                              fontWeight: isProposed ? 700 : 400
                            }}
                          >
                            <td style={{ padding: "12px", color: isProposed ? "#38bdf8" : "#fff" }}>
                              <div>{b.name}</div>
                              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>{b.architecture}</div>
                            </td>
                            <td style={{ padding: "12px", color: "#e2e8f0" }}>{b.accuracy}%</td>
                            <td style={{ padding: "12px", color: "#e2e8f0" }}>{b.precision}%</td>
                            <td style={{ padding: "12px", color: "#10b981" }}>{b.recall}%</td>
                            <td style={{ padding: "12px", color: isProposed ? "#38bdf8" : "#fff", fontSize: 14 }}>
                              <strong>{b.f1_score.toFixed(4)}</strong>
                            </td>
                            <td style={{ padding: "12px" }}>
                              <span style={{
                                padding: "2px 8px",
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 700,
                                background: b.verification_rate === 100 ? "rgba(244, 63, 94, 0.2)" : (b.verification_rate > 0 ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.2)"),
                                color: b.verification_rate === 100 ? "#f43f5e" : (b.verification_rate > 0 ? "#f59e0b" : "#10b981")
                              }}>
                                {b.verification_rate}%
                              </span>
                            </td>
                            <td style={{ padding: "12px", color: "var(--text-muted)" }}>{b.avg_latency_ms} ms</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {baselineData && baselineData.key_finding && (
                <div style={{
                  marginTop: 18,
                  padding: 14,
                  borderRadius: 8,
                  background: "rgba(14, 165, 233, 0.1)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  fontSize: 13,
                  color: "#e0f2fe",
                  lineHeight: 1.5
                }}>
                  <strong>Key Research Finding:</strong> {baselineData.key_finding}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CONTROLLED EXPERIMENT A */}
        {activeTab === "experiments" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{
              background: "rgba(15, 23, 42, 0.85)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 14,
              padding: 24
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>
                Experiment A: Single-Stage vs. Two-Stage Verification Tradeoff
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 20px" }}>
                Hypothesis: Does routing transactions through a two-stage adaptive corridor avoid unnecessary customer verification while preserving recall?
              </p>

              {expAData && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
                  {expAData.map((exp, i) => (
                    <div
                      key={i}
                      style={{
                        background: exp.system.includes("Proposed") ? "rgba(14, 165, 233, 0.12)" : "rgba(30, 41, 59, 0.5)",
                        border: exp.system.includes("Proposed") ? "1.5px solid #38bdf8" : "1px solid var(--border-subtle)",
                        borderRadius: 12,
                        padding: 18
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 800, color: exp.system.includes("Proposed") ? "#38bdf8" : "#fff", marginBottom: 12 }}>
                        {exp.system}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                        <div style={{ background: "rgba(0,0,0,0.3)", padding: 8, borderRadius: 6 }}>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Verification Rate</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: exp.verification_rate_pct > 80 ? "#f43f5e" : "#10b981" }}>
                            {exp.verification_rate_pct}%
                          </div>
                        </div>

                        <div style={{ background: "rgba(0,0,0,0.3)", padding: 8, borderRadius: 6 }}>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Fraud Recall</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#38bdf8" }}>
                            {exp.recall_pct}%
                          </div>
                        </div>

                        <div style={{ background: "rgba(0,0,0,0.3)", padding: 8, borderRadius: 6 }}>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>False Positive %</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b" }}>
                            {exp.false_positive_pct}%
                          </div>
                        </div>

                        <div style={{ background: "rgba(0,0,0,0.3)", padding: 8, borderRadius: 6 }}>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>F1 Score</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                            {exp.f1_score}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
                        {exp.friction_verdict}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ADAPTIVE DATA-DRIVEN THRESHOLD OPTIMIZATION */}
        {activeTab === "thresholds" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{
              background: "rgba(15, 23, 42, 0.85)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 14,
              padding: 24
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>
                Empirical Cost-Optimal Threshold Determination
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 20px" }}>
                Rather than guessing 0.20 and 0.70, thresholds &theta;<sub>low</sub> and &theta;<sub>high</sub> are determined by minimizing total financial risk cost:
                <code style={{ background: "rgba(0,0,0,0.4)", padding: "2px 8px", borderRadius: 4, marginLeft: 6, color: "#38bdf8" }}>
                  Cost = C_FP &middot; FP + C_FN &middot; FN + C_friction &middot; Verifications
                </code>
              </p>

              {/* Sliders */}
              <div style={{
                background: "rgba(30, 41, 59, 0.5)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: 16,
                marginBottom: 20,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 20
              }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: "var(--text-muted)" }}>False Positive Cost (C_FP):</span>
                    <strong style={{ color: "#38bdf8" }}>${costFp}</strong>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={costFp}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setCostFp(v);
                      runThresholdOptimization(v, costFn, costFriction);
                    }}
                    style={{ width: "100%", accentColor: "#38bdf8" }}
                  />
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Cost of pausing legitimate transfer</div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: "var(--text-muted)" }}>False Negative Cost (C_FN):</span>
                    <strong style={{ color: "#f43f5e" }}>${costFn}</strong>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="500"
                    step="10"
                    value={costFn}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setCostFn(v);
                      runThresholdOptimization(costFp, v, costFriction);
                    }}
                    style={{ width: "100%", accentColor: "#f43f5e" }}
                  />
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Cost of missed fraudulent transfer</div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: "var(--text-muted)" }}>Friction Cost (C_friction):</span>
                    <strong style={{ color: "#f59e0b" }}>${costFriction.toFixed(1)}</strong>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="10.0"
                    step="0.5"
                    value={costFriction}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setCostFriction(v);
                      runThresholdOptimization(costFp, costFn, v);
                    }}
                    style={{ width: "100%", accentColor: "#f59e0b" }}
                  />
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Customer friction / drop-off cost</div>
                </div>
              </div>

              {/* Threshold Optimization Results */}
              {thresholdRes && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 20 }}>
                    <div style={{ background: "rgba(14, 165, 233, 0.12)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 11, color: "#38bdf8", textTransform: "uppercase", fontWeight: 700 }}>Optimal &theta; low</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>{thresholdRes.optimal_theta_low}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Auto-Approve boundary</div>
                    </div>

                    <div style={{ background: "rgba(244, 63, 94, 0.12)", border: "1px solid rgba(244, 63, 94, 0.3)", borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 11, color: "#f43f5e", textTransform: "uppercase", fontWeight: 700 }}>Optimal &theta; high</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>{thresholdRes.optimal_theta_high}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Critical Block boundary</div>
                    </div>

                    <div style={{ background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 11, color: "#10b981", textTransform: "uppercase", fontWeight: 700 }}>Cost Reduction</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#10b981" }}>+{thresholdRes.cost_savings_pct}%</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>vs fixed 0.20 / 0.70 guess</div>
                    </div>

                    <div style={{ background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 11, color: "#f59e0b", textTransform: "uppercase", fontWeight: 700 }}>Verification Rate</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>
                        {thresholdRes.optimal_metrics.verification_rate_pct}%
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Only {thresholdRes.optimal_metrics.verifications} transactions routed</div>
                    </div>
                  </div>

                  {/* Visual Corridor Bar */}
                  <div style={{ background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 10 }}>
                      Adaptive Risk Corridor Allocation:
                    </div>
                    <div style={{ height: 28, display: "flex", borderRadius: 6, overflow: "hidden", border: "1px solid var(--border-subtle)" }}>
                      <div style={{
                        width: `${thresholdRes.optimal_theta_low * 100}%`,
                        background: "#10b981",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 800,
                        color: "#000"
                      }}>
                        STAGE 1 APPROVE [0.0 - {thresholdRes.optimal_theta_low}]
                      </div>
                      <div style={{
                        width: `${(thresholdRes.optimal_theta_high - thresholdRes.optimal_theta_low) * 100}%`,
                        background: "#f59e0b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 800,
                        color: "#000"
                      }}>
                        STAGE 2 VERIFICATION [{thresholdRes.optimal_theta_low} - {thresholdRes.optimal_theta_high}]
                      </div>
                      <div style={{
                        width: `${(1.0 - thresholdRes.optimal_theta_high) * 100}%`,
                        background: "#f43f5e",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 800,
                        color: "#fff"
                      }}>
                        CRITICAL STOP [{thresholdRes.optimal_theta_high} - 1.0]
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: ABLATION STUDY */}
        {activeTab === "ablation" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{
              background: "rgba(15, 23, 42, 0.85)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 14,
              padding: 24
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>
                Ablation Study: Subsystem Impact & F1 Degradation
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 20px" }}>
                Systematically removing one component at a time from the full architecture to isolate its empirical contribution on the test benchmark.
              </p>

              {ablationData && ablationData.results && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {ablationData.results.map((item, idx) => {
                    const isBase = item.configuration.includes("Full System");
                    const isWorst = item.delta_f1 < -0.06;
                    return (
                      <div
                        key={idx}
                        style={{
                          background: isBase ? "rgba(14, 165, 233, 0.12)" : "rgba(30, 41, 59, 0.5)",
                          border: isBase ? "1.5px solid #38bdf8" : (isWorst ? "1px solid rgba(244, 63, 94, 0.4)" : "1px solid var(--border-subtle)"),
                          borderRadius: 10,
                          padding: 16,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 16,
                          flexWrap: "wrap"
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 260 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: isBase ? "#38bdf8" : "#fff", marginBottom: 4 }}>
                            {item.configuration}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.description}</div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                          <div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>F1 Score</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{item.f1_score.toFixed(4)}</div>
                          </div>

                          <div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>&Delta; F1</div>
                            <div style={{
                              fontSize: 14,
                              fontWeight: 800,
                              color: item.delta_f1 === 0 ? "#38bdf8" : (item.delta_f1 < 0 ? "#f43f5e" : "#10b981")
                            }}>
                              {item.delta_f1 > 0 ? `+${item.delta_f1.toFixed(4)}` : (item.delta_f1 === 0 ? "Ref" : item.delta_f1.toFixed(4))}
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Recall</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981" }}>{item.recall_pct}%</div>
                          </div>

                          <span style={{
                            padding: "4px 10px",
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            background: isWorst ? "rgba(244, 63, 94, 0.2)" : (isBase ? "rgba(14, 165, 233, 0.2)" : "rgba(255, 255, 255, 0.08)"),
                            color: isWorst ? "#f43f5e" : (isBase ? "#38bdf8" : "var(--text-muted)")
                          }}>
                            {item.impact_verdict}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {ablationData && ablationData.conclusion && (
                <div style={{
                  marginTop: 18,
                  padding: 14,
                  borderRadius: 8,
                  background: "rgba(30, 41, 59, 0.8)",
                  borderLeft: "3px solid #f43f5e",
                  fontSize: 13,
                  color: "#cbd5e1",
                  lineHeight: 1.5
                }}>
                  <strong style={{ color: "#fff" }}>Empirical Conclusion:</strong> {ablationData.conclusion}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: MEASURABLE RAG BENCHMARK */}
        {activeTab === "rag" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{
              background: "rgba(15, 23, 42, 0.85)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 14,
              padding: 24
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>
                Empirical RAG Benchmark Evaluation
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 20px" }}>
                Evaluates compliance policy retrieval accuracy, MRR, citation grounding, and answer consistency across gold-standard financial fraud queries.
              </p>

              {ragData && ragData.metrics && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
                    <div style={{ background: "rgba(30, 41, 59, 0.5)", padding: 14, borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>MRR (Mean Rank)</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#38bdf8" }}>{ragData.metrics.mrr.toFixed(3)}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Top-ranked precision</div>
                    </div>

                    <div style={{ background: "rgba(30, 41, 59, 0.5)", padding: 14, borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Recall @ 1</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{ragData.metrics.recall_at_1}%</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Precise top-1 hit</div>
                    </div>

                    <div style={{ background: "rgba(30, 41, 59, 0.5)", padding: 14, borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Recall @ 3</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#10b981" }}>{ragData.metrics.recall_at_3}%</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Top-3 policy coverage</div>
                    </div>

                    <div style={{ background: "rgba(30, 41, 59, 0.5)", padding: 14, borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Grounding Ratio</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b" }}>{ragData.metrics.policy_grounding_score_pct}%</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Grounded claims</div>
                    </div>

                    <div style={{ background: "rgba(30, 41, 59, 0.5)", padding: 14, borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Consistency</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#a855f7" }}>{ragData.metrics.answer_consistency_pct}%</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Across paraphrases</div>
                    </div>
                  </div>

                  {/* Detailed Query Inspector */}
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
                    Gold-Standard Benchmark Queries Inspection:
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {ragData.detailed_query_results.slice(0, 5).map((q, i) => (
                      <div key={i} style={{ background: "rgba(0,0,0,0.25)", padding: 12, borderRadius: 8, fontSize: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, color: "#38bdf8" }}>{q.category}</span>
                          <span style={{ color: q.is_top1_hit ? "#10b981" : "#f59e0b", fontWeight: 700 }}>
                            {q.is_top1_hit ? "✓ Top-1 Grounded" : "Hit in Top-3"}
                          </span>
                        </div>
                        <div style={{ color: "#cbd5e1", fontStyle: "italic", marginBottom: 6 }}>"{q.query}"</div>
                        <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
                          <span style={{ color: "var(--text-muted)" }}>Retrieved:</span>
                          {q.retrieved.map((pid, pi) => (
                            <span key={pi} style={{
                              background: q.ground_truth.includes(pid) ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.06)",
                              color: q.ground_truth.includes(pid) ? "#10b981" : "var(--text-muted)",
                              padding: "1px 6px",
                              borderRadius: 4
                            }}>
                              {pid}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: C++ MULTITHREADING BENCHMARK */}
        {activeTab === "cpp" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{
              background: "rgba(15, 23, 42, 0.85)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 14,
              padding: 24
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>
                    High-Throughput Stream Ingestion: Python vs. C++ Thread Pool
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                    Comparing single-threaded Python, concurrent thread-pool Python (GIL contention), and native C++17 thread pool.
                  </p>
                </div>
                <button
                  onClick={runCppBenchmark}
                  disabled={benchmarkingCpp}
                  style={{
                    background: "rgba(56, 189, 248, 0.15)",
                    color: "#38bdf8",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    padding: "8px 14px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {benchmarkingCpp ? "Running Benchmark..." : "⚡ Re-Run Benchmark"}
                </button>
              </div>

              {cppData && cppData.results && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 20 }}>
                  {cppData.results.map((r, i) => {
                    const isCpp = r.engine.includes("C++");
                    return (
                      <div
                        key={i}
                        style={{
                          background: isCpp ? "rgba(14, 165, 233, 0.12)" : "rgba(30, 41, 59, 0.5)",
                          border: isCpp ? "1.5px solid #38bdf8" : "1px solid var(--border-subtle)",
                          borderRadius: 12,
                          padding: 18
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: isCpp ? "#38bdf8" : "#fff" }}>{r.engine}</span>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: 10,
                            background: isCpp ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.08)",
                            color: isCpp ? "#10b981" : "var(--text-muted)"
                          }}>
                            {r.speedup}
                          </span>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Throughput (Transactions/Sec)</div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: isCpp ? "#10b981" : "#fff" }}>
                            {r.throughput_tx_per_sec.toLocaleString()} <span style={{ fontSize: 12 }}>tx/s</span>
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 11, background: "rgba(0,0,0,0.25)", padding: 8, borderRadius: 6 }}>
                          <div>
                            <span style={{ color: "var(--text-muted)" }}>p50:</span>
                            <div style={{ fontWeight: 700, color: "#fff" }}>{r.p50_latency_us} &mu;s</div>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-muted)" }}>p95:</span>
                            <div style={{ fontWeight: 700, color: "#fff" }}>{r.p95_latency_us} &mu;s</div>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-muted)" }}>p99:</span>
                            <div style={{ fontWeight: 700, color: isCpp ? "#10b981" : "#f43f5e" }}>{r.p99_latency_us} &mu;s</div>
                          </div>
                        </div>

                        <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-muted)" }}>
                          Concurrency: {r.concurrency}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {cppData && cppData.conclusion && (
                <div style={{
                  padding: 14,
                  borderRadius: 8,
                  background: "rgba(14, 165, 233, 0.1)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  fontSize: 13,
                  color: "#e0f2fe"
                }}>
                  <strong>Engineering Conclusion:</strong> {cppData.conclusion}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 8: FAILURE MODE ANALYSIS */}
        {activeTab === "failures" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{
              background: "rgba(15, 23, 42, 0.85)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 14,
              padding: 24
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>
                Empirical Failure Mode Taxonomy & Mitigation Protocols
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 20px" }}>
                Case studies dissecting Type I, Type II, inter-agent conflict, RAG lexical collisions, and human review overrides.
              </p>

              {failureData && (
                <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
                  {/* Case List */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {failureData.cases.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedFailure(c)}
                        style={{
                          textAlign: "left",
                          padding: "12px 14px",
                          borderRadius: 8,
                          border: selectedFailure && selectedFailure.id === c.id ? "1.5px solid #38bdf8" : "1px solid var(--border-subtle)",
                          background: selectedFailure && selectedFailure.id === c.id ? "rgba(56, 189, 248, 0.15)" : "rgba(30, 41, 59, 0.4)",
                          color: "#fff",
                          cursor: "pointer"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8" }}>{c.id}</span>
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{c.severity}</span>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{c.title}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{c.category}</div>
                      </button>
                    ))}
                  </div>

                  {/* Case Details */}
                  {selectedFailure && (
                    <div style={{
                      background: "rgba(30, 41, 59, 0.6)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 10,
                      padding: 20
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 800, color: "#f43f5e", textTransform: "uppercase" }}>
                            {selectedFailure.category}
                          </span>
                          <h4 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: "4px 0 0" }}>
                            {selectedFailure.title}
                          </h4>
                        </div>
                        <span style={{
                          padding: "3px 10px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background: "rgba(244, 63, 94, 0.2)",
                          color: "#f43f5e"
                        }}>
                          {selectedFailure.severity}
                        </span>
                      </div>

                      {/* Scenario */}
                      <div style={{ background: "rgba(0,0,0,0.3)", padding: 12, borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
                        <div style={{ fontWeight: 700, color: "#38bdf8", marginBottom: 6 }}>Transaction Scenario:</div>
                        <div style={{ color: "#e2e8f0", lineHeight: 1.6 }}>
                          <div><strong>Customer:</strong> {selectedFailure.scenario.customer}</div>
                          <div><strong>Recipient:</strong> {selectedFailure.scenario.recipient}</div>
                          <div><strong>Amount:</strong> ${selectedFailure.scenario.amount.toLocaleString()} ({selectedFailure.scenario.ratio}x baseline)</div>
                          <div><strong>Message Excerpt:</strong> <em>"{selectedFailure.scenario.communication_text}"</em></div>
                          <div style={{ marginTop: 4, color: "#10b981", fontWeight: 700 }}>Ground Truth: {selectedFailure.scenario.ground_truth}</div>
                        </div>
                      </div>

                      {/* Root Cause */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#f43f5e", textTransform: "uppercase", marginBottom: 4 }}>
                          Root Cause Analysis:
                        </div>
                        <p style={{ fontSize: 13, color: "#cbd5e1", margin: 0, lineHeight: 1.5 }}>
                          {selectedFailure.root_cause_analysis}
                        </p>
                      </div>

                      {/* Mitigation */}
                      <div style={{ background: "rgba(16, 185, 129, 0.08)", borderLeft: "3px solid #10b981", padding: "10px 14px", borderRadius: "0 8px 8px 0" }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#10b981", textTransform: "uppercase", marginBottom: 4 }}>
                          Research Mitigation Strategy:
                        </div>
                        <p style={{ fontSize: 13, color: "#e2e8f0", margin: 0, lineHeight: 1.5 }}>
                          {selectedFailure.mitigation_strategy}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 9: BENCHMARK DATASET EXPLORER */}
        {activeTab === "dataset" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{
              background: "rgba(15, 23, 42, 0.85)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 14,
              padding: 24
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>
                    Benchmark Financial Dataset (10,000 Synthetic Transactions)
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                    Labeled benchmark dataset explicitly synthesized for reproducible financial risk research.
                  </p>
                </div>
                {datasetData && (
                  <span style={{ background: "rgba(14, 165, 233, 0.15)", color: "#38bdf8", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                    {datasetData.total_transactions.toLocaleString()} rows | {datasetData.fraud_prevalence_pct}% fraud
                  </span>
                )}
              </div>

              {datasetData && datasetData.features && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 10 }}>18 Feature Schema Attributes:</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8, fontSize: 11 }}>
                    {datasetData.features.map((f, i) => (
                      <div key={i} style={{ background: "rgba(0,0,0,0.25)", padding: "8px 10px", borderRadius: 6 }}>
                        <div style={{ fontWeight: 700, color: "#38bdf8" }}>{f.name} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({f.type})</span></div>
                        <div style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 2 }}>{f.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample Table */}
              {datasetData && datasetData.samples && (
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 10 }}>First 10 Sample Benchmark Records:</h4>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, textAlign: "left" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
                          <th style={{ padding: "8px" }}>Tx ID</th>
                          <th style={{ padding: "8px" }}>Amount</th>
                          <th style={{ padding: "8px" }}>Hour</th>
                          <th style={{ padding: "8px" }}>New Recip</th>
                          <th style={{ padding: "8px" }}>Velocity</th>
                          <th style={{ padding: "8px" }}>Comm Signal</th>
                          <th style={{ padding: "8px" }}>Label</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datasetData.samples.map((row, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td style={{ padding: "8px", color: "#38bdf8", fontWeight: 700 }}>{row.transaction_id}</td>
                            <td style={{ padding: "8px", color: "#fff" }}>${row.amount.toLocaleString()}</td>
                            <td style={{ padding: "8px", color: "var(--text-muted)" }}>{row.hour}:00</td>
                            <td style={{ padding: "8px", color: row.recipient_new ? "#f59e0b" : "#10b981" }}>{row.recipient_new ? "Yes" : "No"}</td>
                            <td style={{ padding: "8px", color: "var(--text-muted)" }}>{row.transfer_velocity}</td>
                            <td style={{ padding: "8px", color: row.communication_signal > 0.5 ? "#f43f5e" : "#10b981" }}>{row.communication_signal}</td>
                            <td style={{ padding: "8px" }}>
                              <span style={{
                                padding: "1px 6px",
                                borderRadius: 10,
                                fontSize: 10,
                                fontWeight: 800,
                                background: row.fraud_label ? "rgba(244, 63, 94, 0.2)" : "rgba(16, 185, 129, 0.2)",
                                color: row.fraud_label ? "#f43f5e" : "#10b981"
                              }}>
                                {row.fraud_label ? "FRAUD (1)" : "LEGIT (0)"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
