"""Kafka -> C++ engine -> Orchestrator.
Usage:  python stream_consumer.py --demo     (no Kafka needed)
        python stream_consumer.py            (reads topic 'transactions')
The C++ engine does multithreaded feature extraction / velocity pre-scoring."""
import json, subprocess, sys, os, random
from schemas.transaction import TransactionIn
from agents.orchestrator import Orchestrator

ENGINE = os.getenv("CPP_ENGINE", os.path.join(os.path.dirname(__file__), "..", "cpp_engine", "engine"))
KEYS = ["id", "user_id", "amount", "avg_amount_90d", "recipient_age_days",
        "prior_tx", "tx_last_24h", "hour", "new_device"]


def run_engine(lines):
    p = subprocess.run([ENGINE], input="\n".join(lines) + "\n", capture_output=True, text=True)
    return [json.loads(l) for l in p.stdout.splitlines() if l.strip()]


def handle(orch, batch):
    by_id = {e["id"]: e for e in batch}
    for f in run_engine([",".join(str(e[k]) for k in KEYS) for e in batch]):
        e = by_id[f["id"]]
        t = TransactionIn(user_id=e["user_id"], recipient_name=e.get("recipient", "Unknown"),
                          amount=e["amount"], avg_amount_90d=e["avg_amount_90d"],
                          recipient_age_days=e["recipient_age_days"], prior_tx_with_recipient=e["prior_tx"],
                          tx_last_24h=e["tx_last_24h"], hour=e["hour"], new_device=bool(e["new_device"]))
        r = orch.assess(t)
        print(f"{f['id']:>4}  amount={e['amount']:>8}  engine_prescore={f['prescore']:.2f}  "
              f"ml={r['risk_score']:.3f}  -> {r['decision']}")


def demo_events(n=12):
    return [dict(id=f"E{i}", user_id=f"U{i%4}", recipient="John",
                 amount=random.choice([20, 60, 400, 3000, 8500]), avg_amount_90d=120,
                 recipient_age_days=random.choice([2, 20, 400, 1500]),
                 prior_tx=random.choice([0, 0, 3, 9]), tx_last_24h=random.randint(0, 5),
                 hour=random.choice([2, 10, 14, 23]), new_device=random.choice([0, 0, 1]))
            for i in range(n)]


if __name__ == "__main__":
    orch = Orchestrator()
    if "--demo" in sys.argv:
        handle(orch, demo_events())
    else:
        from kafka import KafkaConsumer
        c = KafkaConsumer("transactions", bootstrap_servers=os.getenv("KAFKA", "localhost:9092"),
                          value_deserializer=lambda b: json.loads(b))
        buf = []
        for msg in c:
            buf.append(msg.value)
            if len(buf) >= 20:
                handle(orch, buf); buf = []
