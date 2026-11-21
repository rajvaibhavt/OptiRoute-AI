
import { useState } from 'react'
import './assets/main.css'

type DeliveryLocation = {
  id: number
  name: string
  x: number
  y: number
}

function App(): React.JSX.Element {
  const [activePage, setActivePage] = useState('Dashboard')

  const [locations, setLocations] = useState<DeliveryLocation[]>([])
  const [locationName, setLocationName] = useState('')
  const [coordinateX, setCoordinateX] = useState('')
  const [coordinateY, setCoordinateY] = useState('')

  function openRoutePlanner(): void {
    setActivePage('Route Planner')
  }

  function addLocation(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    const name = locationName.trim()

    if (!name || coordinateX === '' || coordinateY === '') {
      return
    }

    const newLocation: DeliveryLocation = {
      id: Date.now(),
      name,
      x: Number(coordinateX),
      y: Number(coordinateY)
    }

    setLocations((previousLocations) => [
      ...previousLocations,
      newLocation
    ])

    setLocationName('')
    setCoordinateX('')
    setCoordinateY('')
  }

  function removeLocation(id: number): void {
    setLocations((previousLocations) =>
      previousLocations.filter((location) => location.id !== id)
    )
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-icon">O</span>
          <span>OptiRoute</span>
        </div>

        <nav className="navigation">
          {['Dashboard', 'Route Planner', 'Deliveries', 'Locations'].map(
            (page) => (
              <button
                key={page}
                className={`nav-item ${
                  activePage === page ? 'active' : ''
                }`}
                onClick={() => setActivePage(page)}
              >
                {page}
              </button>
            )
          )}
        </nav>

        <div className="sidebar-bottom">
          <span>OptiRoute AI</span>
          <small>Route Intelligence</small>
        </div>
      </aside>

      <main className="main-content">
        {activePage === 'Dashboard' ? (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">DELIVERY MANAGEMENT</p>
                <h1>Dashboard</h1>
              </div>

              <div className="status">
                <span className="status-dot"></span>
                Engine ready
              </div>
            </header>

            <section className="welcome">
              <div>
                <p className="eyebrow">SMART ROUTE OPTIMIZATION</p>
                <h2>Plan smarter. Deliver faster.</h2>
                <p>
                  Optimize your delivery routes with intelligent route
                  planning.
                </p>
              </div>

              <button
                className="primary-button"
                onClick={openRoutePlanner}
              >
                + New Route
              </button>
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <p>Total Deliveries</p>
                <h3>{locations.length}</h3>
                <span>
                  {locations.length === 0
                    ? 'No deliveries added'
                    : 'Locations added'}
                </span>
              </div>

              <div className="stat-card">
                <p>Routes Planned</p>
                <h3>0</h3>
                <span>Start planning today</span>
              </div>

              <div className="stat-card">
                <p>Distance Saved</p>
                <h3>0 km</h3>
                <span>Optimization will appear here</span>
              </div>
            </section>

            <section className="route-section">
              <div className="section-heading">
                <div>
                  <h2>Route Overview</h2>
                  <p>Your optimized delivery route will appear here.</p>
                </div>
              </div>

              <div className="empty-state">
                <div className="empty-icon">⌖</div>
                <h3>No route planned yet</h3>
                <p>
                  Add delivery locations and let OptiRoute calculate
                  the most efficient route.
                </p>

                <button
                  className="secondary-button"
                  onClick={openRoutePlanner}
                >
                  Create your first route
                </button>
              </div>
            </section>
          </>
        ) : activePage === 'Route Planner' ? (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">ROUTE MANAGEMENT</p>
                <h1>Route Planner</h1>
              </div>

              <div className="status">
                <span className="status-dot"></span>
                {locations.length} locations
              </div>
            </header>

            <section className="route-section">
              <div className="section-heading">
                <div>
                  <h2>Add delivery locations</h2>
                  <p>
                    Enter location coordinates to prepare your delivery
                    route.
                  </p>
                </div>
              </div>

              <form className="location-form" onSubmit={addLocation}>
                <label>
                  Location name
                  <input
                    type="text"
                    placeholder="e.g. Delivery A"
                    value={locationName}
                    onChange={(event) =>
                      setLocationName(event.target.value)
                    }
                    required
                  />
                </label>

                <div className="coordinate-fields">
                  <label>
                    X coordinate
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 3"
                      value={coordinateX}
                      onChange={(event) =>
                        setCoordinateX(event.target.value)
                      }
                      required
                    />
                  </label>

                  <label>
                    Y coordinate
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 4"
                      value={coordinateY}
                      onChange={(event) =>
                        setCoordinateY(event.target.value)
                      }
                      required
                    />
                  </label>
                </div>

                <button className="primary-button" type="submit">
                  + Add Location
                </button>
              </form>
            </section>

            <section className="route-section">
              <div className="section-heading">
                <div>
                  <h2>Delivery Locations</h2>
                  <p>
                    {locations.length} location
                    {locations.length !== 1 ? 's' : ''} added
                  </p>
                </div>
              </div>

              {locations.length === 0 ? (
                <div className="empty-state">
                  <h3>No locations added</h3>
                  <p>Add your first delivery location using the form.</p>
                </div>
              ) : (
                <div className="location-list">
                  {locations.map((location, index) => (
                    <div className="location-item" key={location.id}>
                      <div className="location-number">{index + 1}</div>

                      <div className="location-details">
                        <h3>{location.name}</h3>
                        <p>
                          X: {location.x} · Y: {location.y}
                        </p>
                      </div>

                      <button
                        className="remove-location-button"
                        onClick={() => removeLocation(location.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <header className="topbar">
            <div>
              <p className="eyebrow">DELIVERY MANAGEMENT</p>
              <h1>{activePage}</h1>
              <p>This section will be implemented in a future step.</p>
            </div>
          </header>
        )}
      </main>
    </div>
  )
}

export default App
