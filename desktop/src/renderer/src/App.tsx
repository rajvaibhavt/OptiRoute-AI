
import './assets/main.css'

function App(): React.JSX.Element {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-icon">O</span>
          <span>OptiRoute</span>
        </div>

        <nav className="navigation">
          <button className="nav-item active">Dashboard</button>
          <button className="nav-item">Route Planner</button>
          <button className="nav-item">Deliveries</button>
          <button className="nav-item">Locations</button>
        </nav>

        <div className="sidebar-bottom">
          <span>OptiRoute AI</span>
          <small>Route Intelligence</small>
        </div>
      </aside>

      <main className="main-content">
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
              Optimize your delivery routes with intelligent route planning.
            </p>
          </div>

          <button className="primary-button">+ New Route</button>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <p>Total Deliveries</p>
            <h3>0</h3>
            <span>No deliveries added</span>
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
            <button className="secondary-button">
              Create your first route
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
