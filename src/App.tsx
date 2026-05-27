import { useState } from 'react'
import TransitTimeDashboard from './components/TransitTimeDashboard'
import FlightPredictor from './components/FlightPredictor'
import FlightMap from './components/FlightMap'
import './App.css'

type View = 'map' | 'dashboard' | 'predictor'

function App() {
  const [view, setView] = useState<View>('map')

  return (
    <div className="app-container">
      <nav className="app-nav">
        <button
          className={view === 'map' ? 'active' : ''}
          onClick={() => setView('map')}
        >
          Live Map
        </button>
        <button
          className={view === 'dashboard' ? 'active' : ''}
          onClick={() => setView('dashboard')}
        >
          Transit Dashboard
        </button>
        <button
          className={view === 'predictor' ? 'active' : ''}
          onClick={() => setView('predictor')}
        >
          Flight Predictor
        </button>
      </nav>

      {view === 'map' && <FlightMap />}
      {view === 'dashboard' && <TransitTimeDashboard />}
      {view === 'predictor' && <FlightPredictor />}
    </div>
  )
}

export default App
