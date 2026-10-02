// Reads CSV events from stdin (or file arg), processes them on a thread pool, prints JSON lines
// in input order. CSV: id,user_id,amount,avg_amount_90d,recipient_age_days,prior_tx,tx_last_24h,hour,new_device
#include <fstream>
#include <future>
#include <iostream>
#include "thread_pool.h"
#include "transaction_processor.h"

int main(int argc, char** argv) {
    std::ifstream file; std::istream* in = &std::cin;
    if (argc > 1) { file.open(argv[1]); in = &file; }
    TransactionProcessor proc; ThreadPool pool;
    std::vector<std::future<Features>> futs; std::string line;
    while (std::getline(*in, line)) {
        Event e;
        if (!proc.parse(line, e)) continue;
        futs.push_back(pool.submit([&proc, e] { return proc.process(e); }));
    }
    for (auto& f : futs) std::cout << TransactionProcessor::to_json(f.get()) << "\n";
    return 0;
}
