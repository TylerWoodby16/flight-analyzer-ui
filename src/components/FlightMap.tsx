import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './FlightMap.css'

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// CLT Airport coordinates
const CLT_CENTER: [number, number] = [35.2140, -80.9431]

interface PathNode {
  node_id: string
  lat: number
  lon: number
  distance_nm: number
}

interface GraphNode {
  node_id: string
  lat: number
  lon: number
  distance_nm: number
  flight_count: number
}

interface LiveFlight {
  flight_id: string
  lat: number
  lon: number
  altitude: number | null
  distance_nm: number
  direction: string
  eta_min?: number | null
  path?: PathNode[]
}

interface SelectedFlight extends LiveFlight {
  predicted_path?: PathNode[]
}

// Custom plane icon
const createPlaneIcon = (rotation: number = 0, isSelected: boolean = false) => L.divIcon({
  html: `<div style="transform: rotate(${rotation}deg); font-size: ${isSelected ? '28px' : '20px'}; filter: ${isSelected ? 'drop-shadow(0 0 8px #4ade80)' : 'none'};">✈️</div>`,
  className: 'plane-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

// Airport icon
const airportIcon = L.divIcon({
  html: '<div style="font-size: 24px;">🛬</div>',
  className: 'airport-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

export default function FlightMap() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [liveFlights, setLiveFlights] = useState<LiveFlight[]>([])
  const [selectedFlight, setSelectedFlight] = useState<SelectedFlight | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showWaypoints, setShowWaypoints] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  // Load graph nodes on mount
  useEffect(() => {
    fetch('http://localhost:8000/api/graph')
      .then(res => res.json())
      .then(data => setNodes(data.nodes || []))
      .catch(console.error)
  }, [])

  // Fetch live flights
  const fetchLiveFlights = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/live-flight-predictions?minutes=3')
      const data = await res.json()
      setLiveFlights(data.predictions || [])
      setLastUpdate(new Date().toLocaleTimeString())
    } catch (err) {
      console.error('Failed to fetch live flights:', err)
    }
  }, [])

  // Poll for live flights when live mode is on
  useEffect(() => {
    if (isLive) {
      fetchLiveFlights()
      const interval = setInterval(fetchLiveFlights, 5000) // Refresh every 5 seconds
      return () => clearInterval(interval)
    }
  }, [isLive, fetchLiveFlights])

  // Toggle live mode
  const toggleLive = () => {
    setIsLive(!isLive)
    if (!isLive) {
      setSelectedFlight(null)
      fetchLiveFlights()
    } else {
      setLiveFlights([])
    }
  }

  // Select a flight to show its predicted path
  const selectFlight = async (flight: LiveFlight) => {
    setLoading(true)
    try {
      const res = await fetch(
        `http://localhost:8000/api/predict?lat=${flight.lat}&lon=${flight.lon}`
      )
      const data = await res.json()
      setSelectedFlight({
        ...flight,
        predicted_path: data.predicted_path,
        eta_min: data.estimated_time_min,
      })
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  // Simulate flight (for when not in live mode)
  const simulateFlight = async () => {
    setLoading(true)
    try {
      const flightRes = await fetch('http://localhost:8000/api/simulate-flight')
      const flightData = await flightRes.json()

      const predRes = await fetch(
        `http://localhost:8000/api/predict?lat=${flightData.lat}&lon=${flightData.lon}`
      )
      const predData = await predRes.json()

      setSelectedFlight({
        flight_id: flightData.flight_id,
        lat: flightData.lat,
        lon: flightData.lon,
        altitude: flightData.altitude,
        distance_nm: predData.distance_to_node_nm,
        direction: predData.direction,
        eta_min: predData.estimated_time_min,
        predicted_path: predData.predicted_path,
      })
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  // Calculate rotation angle for plane icon
  const getPlaneRotation = (lat: number, lon: number): number => {
    const dLat = CLT_CENTER[0] - lat
    const dLon = CLT_CENTER[1] - lon
    const angle = Math.atan2(dLon, dLat) * (180 / Math.PI)
    return angle + 90
  }

  // Path coordinates for selected flight
  const pathCoords: [number, number][] = selectedFlight?.predicted_path
    ?.filter(n => n.lat && n.lon)
    ?.map(n => [n.lat, n.lon]) || []

  const fullPath: [number, number][] = selectedFlight
    ? [[selectedFlight.lat, selectedFlight.lon], ...pathCoords]
    : pathCoords

  return (
    <div className="flight-map-container">
      <div className="map-controls">
        <button
          onClick={toggleLive}
          className={`live-btn ${isLive ? 'active' : ''}`}
        >
          {isLive ? '🔴 LIVE' : '⚪ Go Live'}
        </button>

        {!isLive && (
          <button onClick={simulateFlight} disabled={loading} className="simulate-btn">
            {loading ? 'Loading...' : '✈️ Simulate Flight'}
          </button>
        )}

        <label className="waypoint-toggle">
          <input
            type="checkbox"
            checked={showWaypoints}
            onChange={(e) => setShowWaypoints(e.target.checked)}
          />
          Waypoints
        </label>
      </div>

      {/* Live status */}
      {isLive && (
        <div className="live-status">
          <span className="live-indicator">●</span>
          <span>{liveFlights.length} flights</span>
          {lastUpdate && <span className="last-update">Updated {lastUpdate}</span>}
        </div>
      )}

      {/* Selected flight info */}
      {selectedFlight && (
        <div className="eta-overlay">
          <div className="eta-box">
            <span className="eta-time">
              {selectedFlight.eta_min?.toFixed(1) || '—'}
            </span>
            <span className="eta-unit">min ETA</span>
          </div>
          <div className="flight-info-box">
            <span className="flight-id">{selectedFlight.flight_id}</span>
            <span className="flight-direction">{selectedFlight.direction} arrival</span>
            {selectedFlight.altitude && (
              <span className="flight-alt">{selectedFlight.altitude.toFixed(0)} ft</span>
            )}
            <span className="flight-dist">{selectedFlight.distance_nm?.toFixed(1)} nm out</span>
          </div>
          <button className="close-btn" onClick={() => setSelectedFlight(null)}>×</button>
        </div>
      )}

      {/* Flight list (when live) */}
      {isLive && liveFlights.length > 0 && (
        <div className="flight-list">
          <h3>Incoming Flights</h3>
          <div className="flight-list-items">
            {liveFlights.slice(0, 10).map(f => (
              <div
                key={f.flight_id}
                className={`flight-list-item ${selectedFlight?.flight_id === f.flight_id ? 'selected' : ''}`}
                onClick={() => selectFlight(f)}
              >
                <span className="fl-id">{f.flight_id}</span>
                <span className="fl-eta">{f.eta_min?.toFixed(0) || '?'} min</span>
                <span className="fl-dir">{f.direction}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <MapContainer
        center={CLT_CENTER}
        zoom={8}
        className="map"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Airport marker */}
        <Marker position={CLT_CENTER} icon={airportIcon}>
          <Popup>
            <strong>CLT</strong><br />
            Charlotte Douglas International
          </Popup>
        </Marker>

        {/* Waypoint nodes */}
        {showWaypoints && nodes.map(node => (
          node.lat && node.lon && (
            <CircleMarker
              key={node.node_id}
              center={[node.lat, node.lon]}
              radius={3}
              pathOptions={{
                color: '#4ade80',
                fillColor: '#4ade80',
                fillOpacity: 0.5,
              }}
            >
              <Popup>
                <strong>{node.node_id}</strong><br />
                {node.distance_nm?.toFixed(1)} nm
              </Popup>
            </CircleMarker>
          )
        ))}

        {/* Predicted path for selected flight */}
        {fullPath.length > 1 && (
          <Polyline
            positions={fullPath}
            pathOptions={{
              color: '#4ade80',
              weight: 3,
              opacity: 0.9,
            }}
          />
        )}

        {/* Live flights */}
        {isLive && liveFlights.map(flight => (
          <Marker
            key={flight.flight_id}
            position={[flight.lat, flight.lon]}
            icon={createPlaneIcon(
              getPlaneRotation(flight.lat, flight.lon),
              selectedFlight?.flight_id === flight.flight_id
            )}
            eventHandlers={{
              click: () => selectFlight(flight),
            }}
          >
            <Popup>
              <strong>{flight.flight_id}</strong><br />
              Alt: {flight.altitude?.toFixed(0) || 'N/A'} ft<br />
              ETA: {flight.eta_min?.toFixed(1) || '—'} min<br />
              {flight.distance_nm?.toFixed(1)} nm from CLT
            </Popup>
          </Marker>
        ))}

        {/* Single selected flight (non-live mode) */}
        {!isLive && selectedFlight && (
          <Marker
            position={[selectedFlight.lat, selectedFlight.lon]}
            icon={createPlaneIcon(getPlaneRotation(selectedFlight.lat, selectedFlight.lon), true)}
          >
            <Popup>
              <strong>{selectedFlight.flight_id}</strong><br />
              Alt: {selectedFlight.altitude?.toFixed(0) || 'N/A'} ft<br />
              ETA: {selectedFlight.eta_min?.toFixed(1) || '—'} min
            </Popup>
          </Marker>
        )}

        {/* Path waypoints */}
        {selectedFlight?.predicted_path?.map((node, i) => (
          node.lat && node.lon && (
            <CircleMarker
              key={`path-${node.node_id}-${i}`}
              center={[node.lat, node.lon]}
              radius={5}
              pathOptions={{
                color: '#4ade80',
                fillColor: '#4ade80',
                fillOpacity: 0.8,
                weight: 2,
              }}
            />
          )
        ))}
      </MapContainer>
    </div>
  )
}
