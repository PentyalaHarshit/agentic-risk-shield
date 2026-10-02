#pragma once
#include <mutex>
#include <string>
#include <unordered_map>

struct Event {
    std::string id, user_id;
    double amount = 0, avg_amount_90d = 1;
    int recipient_age_days = 0, prior_tx = 0, tx_last_24h = 0, hour = 12, new_device = 0;
};

struct Features {
    std::string id;
    double amount_ratio = 0, prescore = 0;
    int user_velocity = 0;   // live count of this user's events seen in this run
};

class TransactionProcessor {
public:
    bool parse(const std::string& csv_line, Event& out) const;
    Features process(const Event& e);          // thread-safe
    static std::string to_json(const Features& f);
private:
    std::mutex m_;
    std::unordered_map<std::string, int> velocity_;
};
