"""Data-Driven Adaptive Threshold Optimization for Stage 1 Routing.

Optimizes risk thresholds (theta_low, theta_high) using validation data and a
formal financial risk cost function:
Cost = C_FP * False_Positives + C_FN * False_Negatives + C_friction * Customer_Verifications

Research Question: "Can a two-stage adaptive transaction-risk system reduce
unnecessary customer verification while maintaining strong risk-detection performance?"
"""

import os
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from ml.risk_model import predict, stage1_vector, load_or_create_training_data, get_model

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "synthetic_transactions.csv")


class AdaptiveThresholdOptimizer:
    def __init__(self, val_split: float = 0.2, seed: int = 42):
        self.val_split = val_split
        self.seed = seed
        self._load_val_scores()

    def _load_val_scores(self):
        """Extracts validation split and Stage 1 model scores."""
        X, y = load_or_create_training_data(stage=1)
        rng = np.random.default_rng(self.seed)
        n = len(y)
        indices = np.arange(n)
        rng.shuffle(indices)
        
        val_size = int(n * self.val_split)
        val_idx = indices[:val_size]
        
        self.X_val = X[val_idx]
        self.y_val = y[val_idx]
        
        # Precompute probabilities for speed
        m = get_model(stage=1)
        self.probs = m.predict_proba(self.X_val)[:, 1]

    def evaluate_cost(
        self,
        theta_low: float,
        theta_high: float,
        cost_fp: float = 10.0,
        cost_fn: float = 180.0,
        cost_friction: float = 1.5
    ) -> Tuple[float, Dict[str, float]]:
        """Computes empirical cost on validation set for a pair of thresholds."""
        # Routing decisions:
        # p < theta_low: Auto-Approve (Stage 1)
        # theta_low <= p < theta_high: Route to Stage 2 verification
        # p >= theta_high: Auto-Block / Stop (Critical)
        
        auto_approve = self.probs < theta_low
        stage2_verify = (self.probs >= theta_low) & (self.probs < theta_high)
        auto_block = self.probs >= theta_high
        
        # Errors:
        # False Negative in Stage 1: Fraud auto-approved at Stage 1
        fn_stage1 = np.sum((self.y_val == 1) & auto_approve)
        # False Positive in Stage 1: Legitimate transaction auto-blocked at Stage 1
        fp_stage1 = np.sum((self.y_val == 0) & auto_block)
        # Friction count: Stage 2 verification invoked
        verifications = np.sum(stage2_verify)
        
        # Note: In Stage 2, deep investigation resolves ~92% of frauds and clears 88% of innocents
        stage2_frauds = (self.y_val == 1) & stage2_verify
        stage2_legits = (self.y_val == 0) & stage2_verify
        # Residual Stage 2 errors:
        fn_stage2 = np.sum(stage2_frauds) * 0.08
        fp_stage2 = np.sum(stage2_legits) * 0.06
        
        total_fn = fn_stage1 + fn_stage2
        total_fp = fp_stage1 + fp_stage2
        
        total_cost = (cost_fp * total_fp) + (cost_fn * total_fn) + (cost_friction * verifications)
        
        metrics = {
            "total_cost": round(float(total_cost), 2),
            "false_negatives": int(round(total_fn)),
            "false_positives": int(round(total_fp)),
            "verifications": int(verifications),
            "verification_rate_pct": round(float(verifications / len(self.y_val) * 100), 2),
            "auto_approve_rate_pct": round(float(np.sum(auto_approve) / len(self.y_val) * 100), 2),
            "auto_block_rate_pct": round(float(np.sum(auto_block) / len(self.y_val) * 100), 2),
            "recall_pct": round(float((np.sum(self.y_val) - total_fn) / max(1, np.sum(self.y_val)) * 100), 2)
        }
        return total_cost, metrics

    def optimize(
        self,
        cost_fp: float = 10.0,
        cost_fn: float = 180.0,
        cost_friction: float = 1.5,
        grid_steps: int = 25
    ) -> Dict[str, Any]:
        """Performs grid search optimization over (theta_low, theta_high) parameter space."""
        low_candidates = np.linspace(0.05, 0.45, grid_steps)
        high_candidates = np.linspace(0.55, 0.95, grid_steps)
        
        best_cost = float("inf")
        best_low = 0.20
        best_high = 0.70
        best_metrics = {}
        
        grid_samples = []
        
        for t_low in low_candidates:
            for t_high in high_candidates:
                if t_low >= t_high:
                    continue
                cost, metrics = self.evaluate_cost(t_low, t_high, cost_fp, cost_fn, cost_friction)
                
                if cost < best_cost:
                    best_cost = cost
                    best_low = float(t_low)
                    best_high = float(t_high)
                    best_metrics = metrics
                    
        # Compare against baseline fixed heuristics (e.g. 0.20 and 0.70)
        fixed_cost, fixed_metrics = self.evaluate_cost(0.20, 0.70, cost_fp, cost_fn, cost_friction)
        cost_savings_pct = round(((fixed_cost - best_cost) / max(1.0, fixed_cost)) * 100, 2)
        
        # Build 5x5 heatmap samples for frontend visualization
        sub_lows = np.linspace(0.10, 0.40, 5)
        sub_highs = np.linspace(0.60, 0.90, 5)
        heatmap = []
        for l in sub_lows:
            row = []
            for h in sub_highs:
                c, _ = self.evaluate_cost(l, h, cost_fp, cost_fn, cost_friction)
                row.append(round(c, 1))
            heatmap.append({"theta_low": round(float(l), 2), "costs": row})
            
        return {
            "optimal_theta_low": round(best_low, 3),
            "optimal_theta_high": round(best_high, 3),
            "minimized_cost": best_cost,
            "fixed_heuristic_cost": fixed_cost,
            "cost_savings_pct": cost_savings_pct,
            "cost_weights": {
                "cost_fp": cost_fp,
                "cost_fn": cost_fn,
                "cost_friction": cost_friction
            },
            "optimal_metrics": best_metrics,
            "fixed_metrics": fixed_metrics,
            "heatmap": {
                "high_axis": [round(float(h), 2) for h in sub_highs],
                "rows": heatmap
            }
        }


# Singleton instance
_optimizer = None

def get_optimizer() -> AdaptiveThresholdOptimizer:
    global _optimizer
    if _optimizer is None:
        _optimizer = AdaptiveThresholdOptimizer()
    return _optimizer
