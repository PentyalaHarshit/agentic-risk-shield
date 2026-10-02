# Real-Time Agentic Financial Risk Platform

Two-stage transaction protection: fast ML scoring -> (only if risky) user verification form ->
agentic analysis (ReAct-style tool calls) + XGBoost + RAG -> APPROVE / HOLD / BLOCK with an explanation.

```
Event -> Kafka -> C++ engine (thread pool) -> Orchestrator
   Transaction Agent / Fraud Agent (XGBoost) / Risk Agent
   score < 0.15  -> APPROVE (no friction)
   0.15 - 0.85   -> "I WANT TO PAY" -> mandatory form -> 
                    Communication Agent (WhatsApp/iMessage/Telegram/Signal) +
                    Relationship Agent + XGBoost(stage 2) + RAG
   >= 0.85       -> HOLD
   Stage 2: <0.40 APPROVE | >=0.75 and hard evidence BLOCK | otherwise HOLD (+ XAI explanation)
```

## Run locally (no Docker)
```bash
cd cpp_engine && make && cd ..
cd backend && pip install -r requirements.txt
python ml/risk_model.py                  # trains stage1/stage2 models on synthetic data
uvicorn main:app --reload                # API on :8000 (docs at /docs)
python stream_consumer.py --demo         # C++ engine + orchestrator on fake events (no Kafka)
cd ../frontend && npm install && npm run dev   # UI on :5173
```
Docker: `docker compose up --build`.
Set `ANTHROPIC_API_KEY` to have an LLM polish the explanation text (optional; a template is used otherwise).

## Design decisions (important)
- Missing social profile / different surname / unverified location are **weak signals** only. They raise
  the score for review but can never cause a BLOCK alone (`RiskAgent.stage2`, POLICY-006).
- Only data the user typed or explicitly shared (`shared_messages`, `communication_text`) is analysed. No covert access to
  WhatsApp / Telegram / Signal / iMessage etc. (POLICY-008).
- Explanations state a *risk assessment*, never "this person is a scammer" (POLICY-007).
- Multi-factor risk decomposition decouples individual signals (`transaction_risk`, `communication_risk`, `relationship_risk`, `history_risk`) from the final calibrated decision.
- The models train on **synthetic data** - replace `synth_data()` in `ml/risk_model.py` with real labelled
  data (e.g. IEEE-CIS / PaySim) before drawing any research conclusions.
- `phone_in_user_contacts` and `user_location` are mocked inputs; wire them to a consent-based contacts flow.

## Experiments (for your research)
A: XGBoost only | B: +RAG | C: +Agent | D: +Agent+RAG+XAI | E: D + Social Communication Evidence + streaming.
Metrics: recall, precision, F1, FPR, p50/p95 latency (`GET /api/metrics`), unnecessary interruptions, false positive rates when communication context is added.

## API
- `POST /api/transactions/assess` - stage 1 (behavioral & velocity ML)
- `POST /api/transactions/{id}/verify` - stage 2 (mandatory form + communication forensics + RAG)
- `POST /api/communication/analyze` - real-time preview of social/messaging excerpts
- `GET /api/audit`, `GET /api/metrics`
