
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
    // Constructor
    Location(string locationName, double xCoordinate, double yCoordinate)
        : name(locationName), x(xCoordinate), y(yCoordinate) {
    }

    // Getter methods
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

    // Step 1: Create delivery locations

    vector<Location> locations;

    locations.push_back(Location("Warehouse", 0, 0));
    locations.push_back(Location("Delivery A", 3, 4));
    locations.push_back(Location("Delivery B", 6, 0));
    locations.push_back(Location("Delivery C", 6, 8));

    int n = locations.size();

    // Step 2: Create distance matrix

    vector<vector<double> > distanceMatrix(
        n, vector<double>(n, 0.0)
    );

    for (int i = 0; i < n; i++) {

        for (int j = 0; j < n; j++) {

            distanceMatrix[i][j] =
                calculateDistance(locations[i], locations[j]);
        }
    }

    // Step 3: Display distance matrix

    cout << "Distance Matrix\n\n";

    cout << setw(15) << " ";

    for (int j = 0; j < n; j++) {
        cout << setw(15) << locations[j].getName();
    }

    cout << "\n";

    for (int i = 0; i < n; i++) {

        cout << setw(15) << locations[i].getName();

        for (int j = 0; j < n; j++) {
            cout << setw(15) << distanceMatrix[i][j];
        }

        cout << "\n";
    }

    // Step 4: Dynamic Programming - Bitmask DP

    // Number of delivery locations excluding warehouse
    int deliveryCount = n - 1;

    // Total possible subsets of deliveries
    int stateCount = 1 << deliveryCount;

    // Infinity value
    double INF = numeric_limits<double>::infinity();

    // DP table
    vector<vector<double> > dp(
        stateCount,
        vector<double>(deliveryCount, INF)
    );

    // Parent table for route reconstruction
    vector<vector<int> > parent(
        stateCount,
        vector<int>(deliveryCount, -1)
    );

    // Step 5: Base cases
    // Warehouse -> individual delivery

    for (int j = 0; j < deliveryCount; j++) {

        int mask = 1 << j;

        dp[mask][j] = distanceMatrix[0][j + 1];
    }

    // Step 6: DP transitions

    for (int mask = 1; mask < stateCount; mask++) {

        for (int last = 0; last < deliveryCount; last++) {

            // Check whether last delivery is visited
            if ((mask & (1 << last)) == 0) {
                continue;
            }

            // Try every unvisited delivery
            for (int next = 0; next < deliveryCount; next++) {

                // Skip already visited delivery
                if (mask & (1 << next)) {
                    continue;
                }

                // Add next delivery to visited set
                int newMask = mask | (1 << next);

                // Calculate new route distance
                double newDistance =
                    dp[mask][last] +
                    distanceMatrix[last + 1][next + 1];

                // Update if this route is better
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

        // Store location index
        route.push_back(last + 1);

        // Find previous delivery
        int previous = parent[mask][last];

        // Remove current delivery from mask
        mask = mask ^ (1 << last);

        last = previous;
    }

    // Reverse route to get correct order
    reverse(route.begin(), route.end());

    // Step 9: Display optimized route

    cout << "\nOptimized Delivery Route\n\n";

    cout << "Warehouse";

    for (int locationIndex : route) {

        cout << " -> "
             << locations[locationIndex].getName();
    }

    cout << " -> Warehouse\n";

    cout << "Minimum Distance: "
         << minimumDistance
         << " units\n";

    return 0;
}
