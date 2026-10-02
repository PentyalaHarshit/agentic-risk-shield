#include "transaction_processor.h"
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <sstream>
#include <vector>

bool TransactionProcessor::parse(const std::string& line, Event& e) const {
    std::vector<std::string> p; std::stringstream ss(line); std::string tok;
    while (std::getline(ss, tok, ',')) p.push_back(tok);
    if (p.size() < 9) return false;
    try {
        e.id = p[0]; e.user_id = p[1]; e.amount = std::stod(p[2]); e.avg_amount_90d = std::stod(p[3]);
        e.recipient_age_days = std::stoi(p[4]); e.prior_tx = std::stoi(p[5]);
        e.tx_last_24h = std::stoi(p[6]); e.hour = std::stoi(p[7]); e.new_device = std::stoi(p[8]);
    } catch (...) { return false; }
    return true;
}

Features TransactionProcessor::process(const Event& e) {
    Features f; f.id = e.id;
    f.amount_ratio = e.amount / std::max(e.avg_amount_90d, 1.0);
    { std::lock_guard<std::mutex> lk(m_); f.user_velocity = ++velocity_[e.user_id]; }
    // cheap heuristic pre-score (the real decision comes from the ML model in Python)
    double s = std::min(1.0, std::log1p(f.amount_ratio) / 4.0) * 0.4;
    s += (e.prior_tx == 0) * 0.2 + (e.recipient_age_days < 30) * 0.15;
    s += (e.hour < 5 || e.hour >= 23) * 0.1 + e.new_device * 0.1 + (e.tx_last_24h > 3) * 0.05;
    f.prescore = std::min(1.0, s);
    return f;
}

std::string TransactionProcessor::to_json(const Features& f) {
    char buf[256];
    std::snprintf(buf, sizeof buf,
        "{\"id\":\"%s\",\"amount_ratio\":%.4f,\"prescore\":%.4f,\"user_velocity\":%d}",
        f.id.c_str(), f.amount_ratio, f.prescore, f.user_velocity);
    return buf;
}
