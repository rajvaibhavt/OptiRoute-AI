
#include <iostream>
#include <vector>
#include <iomanip>
#include <limits>
#include <algorithm>
#include <cmath>

using namespace std;

int main() {
    // Step 1: Read number of delivery locations
    int deliveryCount;

    if (!(cin >> deliveryCount)) {
        cerr << "Error: Invalid delivery count." << endl;
        return 1;
    }

    // Maximum 15 deliveries for Bitmask DP
    if (deliveryCount < 0 || deliveryCount > 15) {
        cerr << "Error: Delivery count must be between 0 and 15."
             << endl;
        return 1;
    }

    // Warehouse only: no deliveries
    if (deliveryCount == 0) {
        cout << "DISTANCE 0\n";
        cout << "ROUTE 0\n";
        return 0;
    }

    // Step 2: Number of total locations
    // Index 0 = Warehouse
    // Index 1...N = Deliveries
    int n = deliveryCount + 1;

    // Step 3: Read road-distance matrix
    // Distances are provided by OSRM in meters.
    vector<vector<double>> distanceMatrix(
        n,
        vector<double>(n, 0.0)
    );

    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            double distance;

            if (!(cin >> distance)) {
                cerr << "Error: Invalid distance matrix input."
                     << endl;
                return 1;
            }

            if (!isfinite(distance) || distance < 0) {
                cerr << "Error: Distance must be a finite "
                     << "non-negative number."
                     << endl;
                return 1;
            }

            distanceMatrix[i][j] = distance;
        }
    }

    // Step 4: Bitmask Dynamic Programming
    int stateCount = 1 << deliveryCount;

    double INF = numeric_limits<double>::infinity();

    vector<vector<double>> dp(
        stateCount,
        vector<double>(deliveryCount, INF)
    );

    vector<vector<int>> parent(
        stateCount,
        vector<int>(deliveryCount, -1)
    );

    // Base cases:
    // Warehouse -> individual delivery
    for (int j = 0; j < deliveryCount; j++) {
        int mask = 1 << j;

        dp[mask][j] = distanceMatrix[0][j + 1];
    }

    // Step 5: DP transitions
    for (int mask = 1; mask < stateCount; mask++) {
        for (int last = 0; last < deliveryCount; last++) {

            if ((mask & (1 << last)) == 0) {
                continue;
            }

            for (int next = 0; next < deliveryCount; next++) {

                if (mask & (1 << next)) {
                    continue;
                }

                int newMask = mask | (1 << next);

                double newDistance =
                    dp[mask][last] +
                    distanceMatrix[last + 1][next + 1];

                if (newDistance < dp[newMask][next]) {
                    dp[newMask][next] = newDistance;
                    parent[newMask][next] = last;
                }
            }
        }
    }

    // Step 6: Find minimum distance
    // Return from final delivery to warehouse
    int fullMask = stateCount - 1;

    double minimumDistance = INF;
    int bestLast = -1;

    for (int last = 0; last < deliveryCount; last++) {
        double totalDistance =
            dp[fullMask][last] +
            distanceMatrix[last + 1][0];

        if (totalDistance < minimumDistance) {
            minimumDistance = totalDistance;
            bestLast = last;
        }
    }

    if (bestLast == -1 || !isfinite(minimumDistance)) {
        cerr << "Error: Unable to find a valid route." << endl;
        return 1;
    }

    // Step 7: Reconstruct optimized route
    vector<int> route;

    int mask = fullMask;
    int last = bestLast;

    while (last != -1) {
        route.push_back(last + 1);

        int previous = parent[mask][last];

        mask = mask ^ (1 << last);
        last = previous;
    }

    reverse(route.begin(), route.end());

    // Step 8: Output machine-readable result
    // DISTANCE is in meters
    // ROUTE starts and ends at warehouse index 0
    cout << fixed << setprecision(2);

    cout << "DISTANCE " << minimumDistance << "\n";

    cout << "ROUTE 0";

    for (int locationIndex : route) {
        cout << " " << locationIndex;
    }

    cout << " 0\n";

    return 0;
}
