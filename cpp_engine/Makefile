CXX ?= g++
CXXFLAGS = -std=c++17 -O2 -pthread -Wall
engine: main.cpp transaction_processor.cpp transaction_processor.h thread_pool.h
	$(CXX) $(CXXFLAGS) main.cpp transaction_processor.cpp -o engine
clean:
	rm -f engine
