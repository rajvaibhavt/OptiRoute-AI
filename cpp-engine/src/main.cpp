
#include <iostream>
#include <string>
#include <cmath>
#include <vector>
#include <iomanip>
#include <limits>
#include <algorithm>

using namespace std;

// ===============================
// Location Class
// ===============================

class Location {
private:
    string name;
    double x;
    double y;

public:
    Location(string locationName, double xCoordinate, double yCoordinate)
        : name(locationName), x(xCoordinate), y(yCoordinate) {
    }

    string getName() const {
        return name;
    }

    double getX() const {
        return x;
    }

    double getY() const {
        return y;
    }
};

// ===============================
// Distance Calculation
// ===============================

double calculateDistance(const Location& a, const Location& b) {
    double dx = a.getX() - b.getX();
    double dy = a.getY() - b.getY();

    return sqrt(dx * dx + dy * dy);
}

// ===============================
// Main Function
// ===============================

int main() {
    // Step 1: Read number of delivery locations

    int deliveryCount;

    if (!(cin >> deliveryCount)) {
        cerr << "Error: Invalid delivery count." << endl;
        return 1;
    }

    // Limit locations because Bitmask DP uses exponential memory.
    // Maximum 15 deliveries for this initial version.

    if (deliveryCount < 0 || deliveryCount > 15) {
        cerr << "Error: Delivery count must be between 0 and 15."
             << endl;
        return 1;
    }

    cin.ignore(numeric_limits<streamsize>::max(), '\n');

    // Step 2: Create locations
    // Warehouse is always location index 0.

    vector<Location> locations;

    locations.push_back(Location("Warehouse", 0.0, 0.0));

    for (int i = 0; i < deliveryCount; i++) {
        string name;
        double x;
        double y;

        // Read location name

        getline(cin, name);

        if (name.empty()) {
            cerr << "Error: Location name cannot be empty." << endl;
            return 1;
        }

        // Read coordinates

        if (!(cin >> x >> y)) {
            cerr << "Error: Invalid coordinates." << endl;
            return 1;
        }

        if (!isfinite(x) || !isfinite(y)) {
            cerr << "Error: Coordinates must be finite numbers."
                 << endl;
            return 1;
        }

        cin.ignore(numeric_limits<streamsize>::max(), '\n');

        locations.push_back(Location(name, x, y));
    }

    int n = static_cast<int>(locations.size());

    // Step 3: Handle zero delivery locations

    if (deliveryCount == 0) {
        cout << "DISTANCE 0\n";
        cout << "ROUTE 0\n";
        return 0;
    }

    // Step 4: Create distance matrix

    vector<vector<double>> distanceMatrix(
        n,
        vector<double>(n, 0.0)
    );

    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            distanceMatrix[i][j] =
                calculateDistance(locations[i], locations[j]);
        }
    }

    // Step 5: Bitmask Dynamic Programming

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

    // Step 6: DP transitions

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

    // Step 7: Find minimum distance
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

    // Step 8: Reconstruct optimized route

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

    // Step 9: Output machine-readable result
    // Location index 0 = Warehouse
    // Delivery locations = 1, 2, 3, ...

    cout << fixed << setprecision(6);

    cout << "DISTANCE " << minimumDistance << "\n";

    cout << "ROUTE 0";

    for (int locationIndex : route) {
        cout << " " << locationIndex;
    }

    cout << " 0\n";

    return 0;
}
