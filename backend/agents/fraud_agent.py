from ml import risk_model


class FraudAgent:
    """Tool: calls the XGBoost model and returns an observation."""
    name = "fraud_agent"

    def run(self, vector, stage=1) -> dict:
        obs = risk_model.predict(vector, stage)
        obs["top_factors"] = risk_model.top_factors(vector, stage)
        return obs
