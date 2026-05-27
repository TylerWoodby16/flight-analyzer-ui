import { useState } from 'react'
import './FlightPredictor.css'

interface PathNode {
  node_id: string
  lat: number
  lon: number
  distance_nm: number
}

interface PredictionResult {
  input_position: { lat: number; lon: number }
  direction: string
  nearest_node: string
  distance_to_node_nm: number
  predicted_path: PathNode[]
  estimated_time_min: number | null
  path_length: number
}

interface SimulatedFlight {
  flight_id: string
  lat: number
  lon: number
  altitude: number | null
  timestamp: string
}

export default function FlightPredictor() {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [flight, setFlight] = useState<SimulatedFlight | null>(null)
  const [loading, setLoading] = useState(false)
  const [simulating, setSimulating] = useState(false)

  const simulateNewFlight = async () => {
    setSimulating(true)
    try {
      const res = await fetch('http://localhost:8000/api/simulate-flight')
      const data = await res.json()
      setFlight(data)
      setPrediction(null)
    } catch (err) {
      console.error(err)
    }
    setSimulating(false)
  }

  const predictPath = async () => {
    if (!flight) return
    setLoading(true)
    try {
      const res = await fetch(
        `http://localhost:8000/api/predict?lat=${flight.lat}&lon=${flight.lon}`
      )
      const data = await res.json()
      setPrediction(data)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const runRandomPrediction = async () => {
    setLoading(true)
    setFlight(null)
    try {
      const res = await fetch('http://localhost:8000/api/predict')
      const data = await res.json()
      setPrediction(data)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <div className="flight-predictor">
      <header className="predictor-header">
        <h1>Flight Path Predictor</h1>
        <p className="subtitle">Predict arrival path and ETA for incoming flights</p>
      </header>

      <div className="controls">
        <button onClick={simulateNewFlight} disabled={simulating}>
          {simulating ? 'Loading...' : 'Simulate Incoming Flight'}
        </button>
        <button onClick={runRandomPrediction} disabled={loading}>
          {loading ? 'Predicting...' : 'Random Prediction'}
        </button>
      </div>

      {flight && (
        <div className="flight-card">
          <h2>Incoming Flight</h2>
          <div className="flight-info">
            <div className="info-row">
              <span className="label">Flight ID</span>
              <span className="value">{flight.flight_id}</span>
            </div>
            <div className="info-row">
              <span className="label">Position</span>
              <span className="value">
                {flight.lat.toFixed(4)}, {flight.lon.toFixed(4)}
              </span>
            </div>
            <div className="info-row">
              <span className="label">Altitude</span>
              <span className="value">
                {flight.altitude ? `${flight.altitude.toFixed(0)} ft` : 'N/A'}
              </span>
            </div>
          </div>
          <button className="predict-btn" onClick={predictPath} disabled={loading}>
            {loading ? 'Predicting...' : 'Predict Path →'}
          </button>
        </div>
      )}

      {prediction && (
        <div className="prediction-result">
          <div className="eta-display">
            <div className="eta-value">
              {prediction.estimated_time_min
                ? prediction.estimated_time_min.toFixed(1)
                : '—'}
            </div>
            <div className="eta-label">minutes to landing</div>
          </div>

          <div className="prediction-details">
            <div className="detail-card">
              <span className="detail-label">Direction</span>
              <span className={`detail-value direction-${prediction.direction.toLowerCase()}`}>
                {prediction.direction}
              </span>
            </div>
            <div className="detail-card">
              <span className="detail-label">Entry Point</span>
              <span className="detail-value">{prediction.nearest_node}</span>
            </div>
            <div className="detail-card">
              <span className="detail-label">Path Segments</span>
              <span className="detail-value">{prediction.path_length}</span>
            </div>
          </div>

          <div className="path-visualization">
            <h3>Predicted Path</h3>
            <div className="path-nodes">
              {prediction.predicted_path.map((node, i) => (
                <div key={node.node_id} className="path-node">
                  <div className="node-marker">
                    {i === 0 ? '✈' : i === prediction.predicted_path.length - 1 ? '🛬' : '•'}
                  </div>
                  <div className="node-info">
                    <span className="node-id">{node.node_id}</span>
                    <span className="node-distance">{node.distance_nm?.toFixed(1)} nm</span>
                  </div>
                  {i < prediction.predicted_path.length - 1 && (
                    <div className="path-connector">↓</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!flight && !prediction && (
        <div className="empty-state">
          <p>Click "Simulate Incoming Flight" to get a historical flight position,</p>
          <p>or "Random Prediction" to test with a random outer waypoint.</p>
        </div>
      )}
    </div>
  )
}
