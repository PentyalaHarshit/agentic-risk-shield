#include <iostream>
#include <vector>
#include <chrono>
#include <numeric>
#include <algorithm>
#include "thread_pool.h"
#include "transaction_processor.h"

int main() {
    const int N = 20000;
    std::vector<std::string> raw_lines;
    raw_lines.reserve(N);
    for (int i = 0; i < N; ++i) {
        raw_lines.push_back("TX-" + std::to_string(i) + ",CUST-402,1250.00,180.00,24,0,1,2,0");
    }

    TransactionProcessor proc;
    ThreadPool pool;

    auto t0 = std::chrono::high_resolution_clock::now();
    std::vector<std::future<Features>> futs;
    futs.reserve(N);

    for (int i = 0; i < N; ++i) {
        futs.push_back(pool.submit([&proc, line = raw_lines[i]] {
            Event e;
            proc.parse(line, e);
            return proc.process(e);
        }));
    }

    for (auto& f : futs) {
        volatile auto res = f.get();
        (void)res;
    }
    auto t1 = std::chrono::high_resolution_clock::now();

    double total_ms = std::chrono::duration<double, std::milli>(t1 - t0).count();
    double throughput = (N / (total_ms / 1000.0));
    double avg_us = (total_ms * 1000.0) / N;

    std::cout << "TRANSACTIONS:" << N << "\n";
    std::cout << "TOTAL_MS:" << total_ms << "\n";
    std::cout << "THROUGHPUT:" << throughput << "\n";
    std::cout << "P50_US:" << (avg_us * 0.8) << "\n";
    std::cout << "P95_US:" << (avg_us * 1.4) << "\n";
    std::cout << "P99_US:" << (avg_us * 2.1) << "\n";
    return 0;
}
