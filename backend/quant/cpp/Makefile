CXX ?= g++
CXXFLAGS ?= -O3 -std=c++17 -Wall -Wextra -pedantic

all: quant_engine

quant_engine: quant_engine.cpp
	$(CXX) $(CXXFLAGS) quant_engine.cpp -o quant_engine

clean:
	rm -f quant_engine
