"""XGBoost risk models (two stages). Falls back to sklearn GradientBoosting if xgboost
is not installed. Trains on synthetic data the first time; replace synth_data() with real data."""
import os
import numpy as np
import joblib

try:
    from xgboost import XGBClassifier
    def _make():
        return XGBClassifier(n_estimators=150, max_depth=4, learning_rate=0.1, eval_metric="logloss")
    MODEL_NAME = "XGBoost"
except Exception:
    from sklearn.ensemble import GradientBoostingClassifier
    def _make():
        return GradientBoostingClassifier(n_estimators=150, max_depth=3)
    MODEL_NAME = "GradientBoosting(fallback)"

DIR = os.path.join(os.path.dirname(__file__), "artifacts")

STAGE1_FEATURES = ["amount", "amount_ratio", "recipient_age_days", "prior_tx",
                   "tx_last_24h", "night", "new_device", "fraud_reports"]
STAGE2_FEATURES = STAGE1_FEATURES + ["rel_verified", "phone_known", "location_ok",
                                     "surname_ok", "reason_risk", "history_len", "message_risk"]


def stage1_vector(t) -> list:
    ratio = t.amount / max(t.avg_amount_90d, 1.0)
    return [t.amount, ratio, t.recipient_age_days, t.prior_tx_with_recipient,
            t.tx_last_24h, int(t.hour < 5 or t.hour >= 23), int(t.new_device),
            t.recipient_fraud_reports]


def _path(stage): return os.path.join(DIR, f"stage{stage}.joblib")


def synth_data(n=20000, stage=1, seed=7):
    rng = np.random.default_rng(seed)
    amount = rng.lognormal(4.5, 1.2, n)
    avg = rng.lognormal(4.3, 0.6, n)
    ratio = amount / avg
    age = rng.integers(0, 2000, n)
    prior = rng.poisson(2.0, n)
    t24 = rng.poisson(1.0, n)
    night = rng.integers(0, 2, n) * (rng.random(n) < 0.25)
    dev = (rng.random(n) < 0.1).astype(int)
    reports = rng.poisson(0.2, n)
    logit = (-5.0 + 0.7 * np.log1p(ratio) + 1.1 * (prior == 0) + 0.9 * (age < 30)
             + 0.5 * (t24 > 3) + 0.6 * night + 0.8 * dev + 1.6 * np.minimum(reports, 3)
             + 0.0004 * np.clip(amount - 2000, 0, None))
    cols = [amount, ratio, age, prior, t24, night, dev, reports]
    if stage == 2:
        rel = (rng.random(n) < 0.6).astype(int)
        phone = (rng.random(n) < 0.5).astype(int)
        loc = (rng.random(n) < 0.7).astype(int)
        sur = (rng.random(n) < 0.5).astype(int)
        reason = rng.random(n) ** 2
        hist = rng.integers(0, 300, n)
        msg = rng.random(n) ** 2
        logit = (logit - 1.2 * rel - 1.0 * phone - 0.5 * loc - 0.3 * sur
                 + 2.5 * reason + 2.0 * msg - 0.004 * np.minimum(hist, 200) + 1.0)
        cols += [rel, phone, loc, sur, reason, hist, msg]
    p = 1 / (1 + np.exp(-logit))
    y = (rng.random(n) < p).astype(int)
    return np.column_stack(cols), y


def train(stage: int):
    X, y = synth_data(stage=stage)
    m = _make(); m.fit(X, y)
    os.makedirs(DIR, exist_ok=True)
    joblib.dump(m, _path(stage))
    return m


_cache = {}
def _model(stage):
    if stage not in _cache:
        _cache[stage] = joblib.load(_path(stage)) if os.path.exists(_path(stage)) else train(stage)
    return _cache[stage]


def predict(vector: list, stage: int = 1) -> dict:
    p = float(_model(stage).predict_proba(np.array([vector]))[0][1])
    return {"fraud_probability": round(p, 4), "model": MODEL_NAME, "stage": stage}


def top_factors(vector, stage=1, k=4):
    """Lightweight local explanation: set each feature to a 'normal' value and measure the drop.
    (Swap for SHAP in production: shap.TreeExplainer(model).)"""
    names = STAGE1_FEATURES if stage == 1 else STAGE2_FEATURES
    base = predict(vector, stage)["fraud_probability"]
    neutral = {"amount": 50, "amount_ratio": 1, "recipient_age_days": 800, "prior_tx": 5,
               "tx_last_24h": 0, "night": 0, "new_device": 0, "fraud_reports": 0,
               "rel_verified": 1, "phone_known": 1, "location_ok": 1, "surname_ok": 1,
               "reason_risk": 0, "history_len": 150, "message_risk": 0}
    out = []
    for i, n in enumerate(names):
        v = list(vector); v[i] = neutral[n]
        out.append((n, base - predict(v, stage)["fraud_probability"]))
    out.sort(key=lambda x: -x[1])
    return [{"feature": n, "contribution": round(c, 4)} for n, c in out[:k] if c > 0.01]


if __name__ == "__main__":
    for s in (1, 2):
        train(s); print("trained stage", s, MODEL_NAME)
