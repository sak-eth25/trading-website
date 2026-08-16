#include <algorithm>
#include <cmath>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <numeric>
#include <sstream>
#include <string>
#include <vector>

// Standalone C++ quantitative research engine.
// CSV format: timestamp,price
// Usage: ./quant_engine prices.csv momentum 10
//     or ./quant_engine prices.csv mean_reversion 20 1.5 0.25

struct Bar { std::string timestamp; double price; };

static double mean(const std::vector<double>& x, size_t l, size_t r) {
    if (r <= l) return 0.0;
    return std::accumulate(x.begin()+l, x.begin()+r, 0.0) / double(r-l);
}

static double stdev(const std::vector<double>& x, size_t l, size_t r) {
    if (r <= l + 1) return 0.0;
    double m = mean(x,l,r), s = 0.0;
    for (size_t i=l;i<r;i++) s += (x[i]-m)*(x[i]-m);
    return std::sqrt(s / double(r-l-1));
}

int main(int argc, char** argv) {
    if (argc < 4) {
        std::cerr << "Usage: quant_engine <csv> <momentum|mean_reversion> <window> [entry_z] [exit_z]\n";
        return 1;
    }

    std::ifstream in(argv[1]);
    if (!in) { std::cerr << "Cannot open CSV\n"; return 1; }

    std::vector<Bar> bars;
    std::string line;
    std::getline(in,line); // header
    while (std::getline(in,line)) {
        std::stringstream ss(line);
        std::string ts, ps;
        if (!std::getline(ss,ts,',')) continue;
        if (!std::getline(ss,ps,',')) continue;
        try { bars.push_back({ts,std::stod(ps)}); } catch (...) {}
    }
    if (bars.size() < 5) { std::cerr << "Need at least 5 observations\n"; return 1; }

    const std::string strategy = argv[2];
    const int window = std::max(1, std::stoi(argv[3]));
    const double entry = argc > 4 ? std::stod(argv[4]) : 1.5;
    const double exit = argc > 5 ? std::stod(argv[5]) : 0.25;

    std::vector<double> p;
    for (auto& b: bars) if (b.price > 0) p.push_back(b.price);
    std::vector<int> signal(p.size(),0);
    int position = 0;

    for (size_t i=0;i<p.size();i++) {
        if (strategy == "momentum") {
            if (i >= (size_t)window) signal[i] = p[i] > p[i-window] ? 1 : (p[i] < p[i-window] ? -1 : 0);
        } else if (strategy == "mean_reversion") {
            size_t l = i >= (size_t)window-1 ? i-(window-1) : 0;
            double m = mean(p,l,i+1), sd = stdev(p,l,i+1);
            if (sd > 0) {
                double z = (p[i]-m)/sd;
                if (z <= -entry) position = 1;
                else if (z >= entry) position = -1;
                else if (std::abs(z) <= exit) position = 0;
            }
            signal[i] = position;
        } else {
            std::cerr << "Unknown strategy\n"; return 1;
        }
    }

    double equity = 1.0;
    double peak = 1.0, maxdd = 0.0;
    double sum = 0.0, sumsq = 0.0;
    int n = 0, trades = 0, prev = 0;
    const double cost_bps = 7.0;

    std::cout << "timestamp,equity,return,position\n";
    std::cout << std::fixed << std::setprecision(8);
    std::cout << bars[0].timestamp << ",1.00000000,0.00000000,0\n";

    for (size_t i=0;i+1<p.size();i++) {
        int target = signal[i];
        double turnover = std::abs(target-prev);
        double ret = target * (p[i+1]/p[i]-1.0) - turnover*cost_bps/10000.0;
        equity *= (1.0+ret);
        sum += ret; sumsq += ret*ret; n++;
        if (target != prev) trades++;
        prev = target;
        peak = std::max(peak,equity);
        maxdd = std::min(maxdd,equity/peak-1.0);
        std::cout << bars[i+1].timestamp << ',' << equity << ',' << ret << ',' << target << '\n';
    }

    double mu = n ? sum/n : 0.0;
    double var = n > 1 ? (sumsq - n*mu*mu)/(n-1) : 0.0;
    double vol = std::sqrt(std::max(0.0,var));
    double sharpe = vol > 0 ? mu/vol*std::sqrt(252.0) : 0.0;

    std::cerr << "Final equity: " << equity << '\n';
    std::cerr << "Total return: " << equity-1.0 << '\n';
    std::cerr << "Volatility: " << vol*std::sqrt(252.0) << '\n';
    std::cerr << "Sharpe: " << sharpe << '\n';
    std::cerr << "Max drawdown: " << maxdd << '\n';
    std::cerr << "Trades: " << trades << '\n';
    return 0;
}
