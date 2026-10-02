"""XGBoost risk models with rigorous SHAP (Shapley Additive exPlanations).

Provides:
- Stage 1 Fast Screening Model (Transaction-level features)
- Stage 2 Deep Fusion Model (Transaction + Behavioral + Communication + Relationship)
- Exact TreeExplainer SHAP attribution per inference
- Feature importance ranking and friendly risk explanations
"""

import os
import joblib
import numpy as np
import pandas as pd
import shap
from typing import List, Dict, Any, Tuple

try:
    from xgboost import XGBClassifier
    def _make():
        return XGBClassifier(n_estimators=120, max_depth=4, learning_rate=0.08, eval_metric="logloss", random_state=42)
    MODEL_NAME = "XGBoost"
except Exception:
    from sklearn.ensemble import GradientBoostingClassifier
    def _make():
        return GradientBoostingClassifier(n_estimators=100, max_depth=3, random_state=42)
    MODEL_NAME = "GradientBoosting"

DIR = os.path.join(os.path.dirname(__file__), "artifacts")
DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "synthetic_transactions.csv")

STAGE1_FEATURES = [
    "amount",
    "amount_ratio",
    "recipient_age_days",
    "prior_tx",
    "tx_last_24h",
    "night",
    "new_device",
    "failed_login_count"
]

STAGE2_FEATURES = STAGE1_FEATURES + [
    "rel_verified",
    "phone_known",
    "location_ok",
    "surname_ok",
    "reason_risk",
    "history_len",
    "communication_signal"
]

FRIENDLY_NAMES = {
    "amount": "Transfer Amount",
    "amount_ratio": "Amount vs 90d Baseline Ratio",
    "recipient_age_days": "Recipient Account Age",
    "prior_tx": "Prior Transfer Count with Recipient",
    "tx_last_24h": "Transfer Velocity (24h Window)",
    "night": "Unusual Time (Night Hours)",
    "new_device": "Unrecognized Device Fingerprint",
    "failed_login_count": "Pre-Transfer Failed Logins",
    "rel_verified": "Relationship Verification Status",
    "phone_known": "Recipient Phone in Verified Contacts",
    "location_ok": "Geographic Proximity Verification",
    "surname_ok": "Recipient Name Consistency",
    "reason_risk": "Payment Memo / Urgency Indicator",
    "history_len": "Relationship History Depth",
    "communication_signal": "Communication Channel Pressure/Urgency"
}

def _path(stage: int) -> str:
    return os.path.join(DIR, f"stage{stage}.joblib")

def _explainer_path(stage: int) -> str:
    return os.path.join(DIR, f"stage{stage}_explainer.joblib")

def stage1_vector(t) -> list:
    """Builds Stage 1 feature vector from transaction request object."""
    avg = getattr(t, "avg_amount_90d", 120.0) or 120.0
    ratio = float(t.amount) / max(float(avg), 1.0)
    hour = getattr(t, "hour", 12)
    is_night = int(hour < 5 or hour >= 23)
    new_dev = int(bool(getattr(t, "new_device", False)))
    failed_logins = int(getattr(t, "failed_login_count", 0) or 0)
    recip_age = getattr(t, "recipient_age_days", 180) or 180
    prior = getattr(t, "prior_tx_with_recipient", 0) or 0
    v24 = getattr(t, "tx_last_24h", 0) or 0

    return [
        float(t.amount),
        float(ratio),
        int(recip_age),
        int(prior),
        int(v24),
        int(is_night),
        int(new_dev),
        int(failed_logins)
    ]

def load_or_create_training_data(stage: int = 1) -> Tuple[np.ndarray, np.ndarray]:
    """Loads feature matrix from benchmark dataset or generates synthetic equivalent."""
    if os.path.exists(DATA_PATH):
        df = pd.read_csv(DATA_PATH)
        amount = df["amount"].values
        avg = df["average_transfer_amount"].values
        ratio = amount / np.maximum(avg, 1.0)
        age = df["recipient_age"].values
        prior = df["previous_transaction_count"].values
        t24 = df["transfer_velocity"].values
        night = ((df["hour"] < 5) | (df["hour"] >= 23)).astype(int).values
        dev = df["device_change"].values
        failed_logins = df["failed_login_count"].values
        y = df["fraud_label"].values

        cols = [amount, ratio, age, prior, t24, night, dev, failed_logins]
        if stage == 2:
            rel = (df["previous_transaction_count"] > 0).astype(int).values
            phone = (df["previous_transaction_count"] > 1).astype(int).values
            loc = (df["location_distance"] < 100).astype(int).values
            sur = (df["recipient_new"] == 0).astype(int).values
            reason = np.clip(df["communication_signal"] * 0.8, 0, 1).values
            hist = df["account_age"].values
            comm = df["communication_signal"].values
            cols += [rel, phone, loc, sur, reason, hist, comm]
        return np.column_stack(cols), y

    # Fallback generator if CSV does not exist yet
    rng = np.random.default_rng(42)
    n = 10000
    amount = rng.lognormal(4.5, 1.2, n)
    avg = rng.lognormal(4.3, 0.6, n)
    ratio = amount / avg
    age = rng.integers(1, 1000, n)
    prior = rng.poisson(2.0, n)
    t24 = rng.poisson(1.0, n)
    night = (rng.integers(0, 24, n) < 5).astype(int)
    dev = (rng.random(n) < 0.12).astype(int)
    failed = np.random.choice([0, 1, 2], size=n, p=[0.85, 0.12, 0.03])
    
    logit = (-5.5 + 0.8 * np.log1p(ratio) + 1.2 * (prior == 0) + 0.7 * (age < 30)
             + 0.6 * (t24 > 3) + 0.6 * night + 1.0 * dev + 0.5 * failed)
    cols = [amount, ratio, age, prior, t24, night, dev, failed]
    if stage == 2:
        rel = (rng.random(n) < 0.6).astype(int)
        phone = (rng.random(n) < 0.5).astype(int)
        loc = (rng.random(n) < 0.7).astype(int)
        sur = (rng.random(n) < 0.5).astype(int)
        reason = rng.random(n) ** 2
        hist = rng.integers(0, 300, n)
        comm = rng.random(n) ** 2
        logit = (logit - 1.2 * rel - 1.0 * phone - 0.5 * loc - 0.3 * sur
                 + 2.5 * reason + 2.0 * comm - 0.004 * np.minimum(hist, 200))
        cols += [rel, phone, loc, sur, reason, hist, comm]
    p = 1 / (1 + np.exp(-logit))
    y = (rng.random(n) < p).astype(int)
    return np.column_stack(cols), y

def train(stage: int):
    """Trains stage model and initializes SHAP TreeExplainer."""
    X, y = load_or_create_training_data(stage=stage)
    m = _make()
    m.fit(X, y)
    
    # Initialize SHAP explainer
    explainer = shap.TreeExplainer(m)
    
    os.makedirs(DIR, exist_ok=True)
    joblib.dump(m, _path(stage))
    joblib.dump(explainer, _explainer_path(stage))
    return m, explainer

_model_cache = {}
_explainer_cache = {}

def get_model(stage: int):
    if stage not in _model_cache:
        m_path = _path(stage)
        if os.path.exists(m_path):
            _model_cache[stage] = joblib.load(m_path)
        else:
            m, exp = train(stage)
            _model_cache[stage] = m
            _explainer_cache[stage] = exp
    return _model_cache[stage]

def get_explainer(stage: int):
    if stage not in _explainer_cache:
        e_path = _explainer_path(stage)
        if os.path.exists(e_path):
            _explainer_cache[stage] = joblib.load(e_path)
        else:
            get_model(stage)
            if stage not in _explainer_cache:
                _explainer_cache[stage] = shap.TreeExplainer(_model_cache[stage])
    return _explainer_cache[stage]

def predict(vector: list, stage: int = 1) -> dict:
    """Predicts fraud risk probability for input feature vector."""
    m = get_model(stage)
    arr = np.array([vector])
    prob = float(m.predict_proba(arr)[0][1])
    return {
        "fraud_probability": round(prob, 4),
        "model": MODEL_NAME,
        "stage": stage
    }

def explain_shap(vector: list, stage: int = 1, top_k: int = 6) -> dict:
    """Computes exact SHAP values and feature contributions for the prediction."""
    explainer = get_explainer(stage)
    arr = np.array([vector])
    shap_res = explainer(arr)
    
    # Base value and raw SHAP values
    base_val = float(shap_res.base_values[0]) if hasattr(shap_res.base_values, "__getitem__") else float(shap_res.base_values)
    values = shap_res.values[0]
    
    feature_names = STAGE1_FEATURES if stage == 1 else STAGE2_FEATURES
    
    factors = []
    for name, val, raw_input in zip(feature_names, values, vector):
        shap_val = float(val)
        friendly = FRIENDLY_NAMES.get(name, name)
        direction = "risk_increasing" if shap_val > 0 else "risk_mitigating"
        factors.append({
            "feature": name,
            "display_name": friendly,
            "raw_value": float(raw_input),
            "shap_value": round(shap_val, 4),
            "abs_shap": abs(round(shap_val, 4)),
            "direction": direction,
            "impact": "High Risk" if shap_val > 0.15 else ("Moderate Risk" if shap_val > 0.05 else ("Protective" if shap_val < -0.05 else "Neutral"))
        })
    
    # Sort by absolute SHAP impact
    factors.sort(key=lambda x: -x["abs_shap"])
    top_factors = factors[:top_k]
    
    # Legacy top factors format for backward compatibility
    legacy_factors = [{"feature": f["feature"], "contribution": max(0.01, f["shap_value"])} for f in top_factors if f["shap_value"] > 0]
    
    return {
        "base_value": round(base_val, 4),
        "feature_attributions": top_factors,
        "all_attributions": factors,
        "top_factors": legacy_factors
    }

if __name__ == "__main__":
    for s in (1, 2):
        train(s)
        print(f"Trained Stage {s} {MODEL_NAME} with SHAP TreeExplainer.")
