from ml import risk_model


class TransactionAgent:
    """Tool: transaction + history analysis."""
    name = "transaction_agent"

    def run(self, t) -> dict:
        ratio = t.amount / max(t.avg_amount_90d, 1.0)
        flags = []
        if ratio > 5: flags.append(f"amount is {ratio:.1f}x your 90-day average")
        if t.prior_tx_with_recipient == 0: flags.append("no previous transfers to this recipient")
        if t.recipient_age_days < 30: flags.append("recipient account is very new")
        if t.tx_last_24h > 3: flags.append("unusually many transfers in 24h")
        if t.hour < 5 or t.hour >= 23: flags.append("transfer at an unusual hour")
        if t.new_device: flags.append("new device")
        return {"flags": flags, "vector": risk_model.stage1_vector(t)}
