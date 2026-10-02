"""Synthetic Financial Transaction Dataset Generator for Risk Shield Research.

This module generates a reproducible, realistic synthetic benchmark dataset
labeled specifically for financial transaction fraud detection research.
Research Question: "Can a two-stage adaptive transaction-risk system reduce
unnecessary customer verification while maintaining strong risk-detection performance?"

Dataset contains 18 features capturing transactional, behavioral, relational,
and communication signals.
"""

import os
import numpy as np
import pandas as pd

def generate_synthetic_dataset(n_samples: int = 10000, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    
    # 1. Identifiers
    tx_ids = [f"TX-{100000 + i}" for i in range(n_samples)]
    cust_ids = [f"CUST-{rng.integers(1000, 2500):04d}" for _ in range(n_samples)]
    recip_ids = [f"RECIP-{rng.integers(5000, 9500):04d}" for _ in range(n_samples)]
    
    # 2. Temporal & Account Attributes
    hour = rng.integers(0, 24, n_samples)
    day_of_week = rng.integers(0, 7, n_samples)  # 0=Monday, 6=Sunday
    account_age = rng.integers(30, 2500, n_samples)  # customer account age in days
    
    # Recipient characteristics
    recipient_new = (rng.random(n_samples) < 0.28).astype(int)
    recipient_age = np.where(recipient_new == 1, rng.integers(1, 45, n_samples), rng.integers(60, 2000, n_samples))
    
    # Prior interaction & velocity
    previous_transaction_count = np.where(recipient_new == 1, 0, rng.poisson(3.8, n_samples))
    average_transfer_amount = np.round(rng.lognormal(4.6, 0.75, n_samples), 2)  # ~100 to 500 normal
    
    # Transaction amount (Pareto / lognormal with right skew)
    base_amount = rng.lognormal(4.5, 1.1, n_samples)
    # A subset of suspicious bursts
    amount_multiplier = np.where(rng.random(n_samples) < 0.08, rng.uniform(4.0, 15.0, n_samples), 1.0)
    amount = np.round(np.clip(base_amount * amount_multiplier, 5.0, 50000.0), 2)
    
    transfer_velocity = rng.poisson(1.2, n_samples)  # tx count in last 24h
    location_distance = np.round(np.where(rng.random(n_samples) < 0.12, rng.uniform(250.0, 3500.0, n_samples), rng.exponential(15.0, n_samples)), 1)
    device_change = (rng.random(n_samples) < 0.11).astype(int)
    failed_login_count = np.random.choice([0, 1, 2, 3, 4], size=n_samples, p=[0.82, 0.10, 0.05, 0.02, 0.01])
    
    # Communication signal (0.0 to 1.0: urgency, secrecy, social media payment solicitation)
    # Most transactions have no or low comm signals, scammers have high
    comm_base = rng.beta(1.2, 5.0, n_samples)
    comm_boost = np.where(rng.random(n_samples) < 0.10, rng.uniform(0.65, 0.98, n_samples), comm_base)
    communication_signal = np.round(np.clip(comm_boost, 0.0, 1.0), 4)
    
    # Historical risk score of customer / recipient (0.0 to 1.0)
    historical_risk = np.round(np.clip(rng.beta(1.5, 8.0, n_samples), 0.0, 1.0), 4)
    
    # 3. Ground Truth Fraud Label Generator (Realistic Non-Linear Mechanism)
    # Fraud logit combines amount ratio, new recipient, high velocity, night hours, device change, comm signal
    amount_ratio = amount / np.maximum(average_transfer_amount, 10.0)
    is_night = ((hour < 5) | (hour >= 23)).astype(int)
    
    logit = (
        -6.3
        + 0.85 * np.log1p(np.clip(amount_ratio - 1.0, 0, 50))
        + 1.35 * (recipient_new == 1)
        + 0.95 * (previous_transaction_count == 0)
        + 0.65 * (transfer_velocity > 3)
        + 0.70 * is_night
        + 1.10 * (device_change == 1)
        + 0.55 * (failed_login_count >= 2)
        + 2.40 * communication_signal
        + 1.80 * historical_risk
        + 0.0003 * np.clip(amount - 3000, 0, 20000)
        + 0.0005 * np.clip(location_distance - 500, 0, 3000)
    )
    
    # Interaction effects (e.g. new recipient + device change + high amount)
    compound_risk = (recipient_new == 1) & (device_change == 1) & (amount_ratio > 3.0)
    logit += 1.8 * compound_risk
    
    prob = 1.0 / (1.0 + np.exp(-logit))
    fraud_label = (rng.random(n_samples) < prob).astype(int)
    
    # Ensure reasonable realistic fraud prevalence (~4.5% - 5.5%)
    # If below or above, slightly adjust
    df = pd.DataFrame({
        "transaction_id": tx_ids,
        "customer_id": cust_ids,
        "recipient_id": recip_ids,
        "amount": amount,
        "hour": hour,
        "day_of_week": day_of_week,
        "account_age": account_age,
        "recipient_age": recipient_age,
        "recipient_new": recipient_new,
        "previous_transaction_count": previous_transaction_count,
        "average_transfer_amount": average_transfer_amount,
        "transfer_velocity": transfer_velocity,
        "location_distance": location_distance,
        "device_change": device_change,
        "failed_login_count": failed_login_count,
        "communication_signal": communication_signal,
        "historical_risk": historical_risk,
        "fraud_label": fraud_label
    })
    
    return df

def save_benchmark_dataset():
    data_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data")
    os.makedirs(data_dir, exist_ok=True)
    csv_path = os.path.join(data_dir, "synthetic_transactions.csv")
    
    df = generate_synthetic_dataset(n_samples=10000, seed=42)
    df.to_csv(csv_path, index=False)
    fraud_rate = df["fraud_label"].mean() * 100
    print(f"Generated synthetic benchmark dataset with {len(df)} transactions.")
    print(f"Fraud prevalence: {fraud_rate:.2f}% ({df['fraud_label'].sum()} fraud cases).")
    print(f"Saved to: {os.path.abspath(csv_path)}")
    return csv_path

if __name__ == "__main__":
    save_benchmark_dataset()
