from ml import risk_model


class FraudAgent:
    """Tool: calls the XGBoost model and returns an observation."""
    name = "fraud_agent"

    def run(self, vector, stage=1) -> dict:
        obs = risk_model.predict(vector, stage)
        shap_info = risk_model.explain_shap(vector, stage)
        obs["top_factors"] = shap_info["top_factors"]
        obs["shap_attributions"] = shap_info["feature_attributions"]
        obs["base_value"] = shap_info["base_value"]
        return obs
