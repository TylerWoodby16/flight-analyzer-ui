import { useState, useEffect } from 'react'
import './TransitTimeDashboard.css'

interface DirectionStats {
  count: number
  mean: number
  std: number
  min: number
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
  max: number
}

interface TransitTimeData {
  ring_distance_nm: number
  data_date_range: {
    start: string
    end: string
  }
  overall: DirectionStats
  by_direction: {
    North: DirectionStats
    South: DirectionStats
  }
}

export default function TransitTimeDashboard() {
  const [data, setData] = useState<TransitTimeData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('http://localhost:8000/api/transit-times')
      .then(res => res.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="loading">Loading transit data...</div>
  if (!data) return <div className="error">Failed to load data</div>

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="transit-dashboard">
      <header className="dashboard-header">
        <h1>CLT Transit Time Dashboard</h1>
        <p className="subtitle">
          Flights from {data.ring_distance_nm}nm ring to landing
        </p>
        <p className="date-range">
          {formatDate(data.data_date_range.start)} - {formatDate(data.data_date_range.end)}
        </p>
      </header>

      <section className="overall-stats">
        <h2>Overall Performance</h2>
        <div className="big-number">
          <span className="value">{data.overall.mean.toFixed(1)}</span>
          <span className="unit">min</span>
          <span className="label">Average Transit Time</span>
        </div>
        <div className="stats-row">
          <div className="stat-box">
            <span className="stat-value">{data.overall.count.toLocaleString()}</span>
            <span className="stat-label">Total Flights</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{data.overall.min.toFixed(1)}</span>
            <span className="stat-label">Fastest (min)</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{data.overall.max.toFixed(1)}</span>
            <span className="stat-label">Slowest (min)</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">±{data.overall.std.toFixed(1)}</span>
            <span className="stat-label">Std Dev (min)</span>
          </div>
        </div>
      </section>

      <section className="direction-comparison">
        <h2>North vs South Arrivals</h2>
        <div className="direction-cards">
          <DirectionCard
            direction="North"
            stats={data.by_direction.North}
            color="#4ade80"
          />
          <DirectionCard
            direction="South"
            stats={data.by_direction.South}
            color="#f97316"
          />
        </div>
      </section>

      <section className="percentile-chart">
        <h2>Transit Time Distribution</h2>
        <PercentileChart overall={data.overall} byDirection={data.by_direction} />
      </section>
    </div>
  )
}

function DirectionCard({ direction, stats, color }: {
  direction: string
  stats: DirectionStats
  color: string
}) {
  const percentage = direction === 'North'
    ? ((stats.count / (stats.count + 1939)) * 100)
    : ((stats.count / (stats.count + 3545)) * 100)

  return (
    <div className="direction-card" style={{ borderColor: color }}>
      <h3 style={{ color }}>{direction}</h3>
      <div className="direction-mean">
        <span className="value">{stats.mean.toFixed(1)}</span>
        <span className="unit">min avg</span>
      </div>
      <div className="direction-details">
        <div className="detail">
          <span className="label">Flights</span>
          <span className="value">{stats.count.toLocaleString()}</span>
        </div>
        <div className="detail">
          <span className="label">Share</span>
          <span className="value">{percentage.toFixed(0)}%</span>
        </div>
        <div className="detail">
          <span className="label">Median</span>
          <span className="value">{stats.p50.toFixed(1)} min</span>
        </div>
        <div className="detail">
          <span className="label">90th %ile</span>
          <span className="value">{stats.p90.toFixed(1)} min</span>
        </div>
      </div>
    </div>
  )
}

function PercentileChart({ overall, byDirection }: {
  overall: DirectionStats
  byDirection: { North: DirectionStats; South: DirectionStats }
}) {
  const percentiles = ['min', 'p10', 'p25', 'p50', 'p75', 'p90', 'max'] as const
  const labels = ['Min', '10%', '25%', '50%', '75%', '90%', 'Max']

  const maxValue = Math.max(overall.max, byDirection.North.max, byDirection.South.max)

  return (
    <div className="chart-container">
      <div className="chart-legend">
        <span className="legend-item"><span className="dot overall"></span> Overall</span>
        <span className="legend-item"><span className="dot north"></span> North</span>
        <span className="legend-item"><span className="dot south"></span> South</span>
      </div>
      <div className="percentile-bars">
        {percentiles.map((p, i) => (
          <div key={p} className="percentile-group">
            <span className="percentile-label">{labels[i]}</span>
            <div className="bars">
              <div
                className="bar overall"
                style={{ width: `${(overall[p] / maxValue) * 100}%` }}
              >
                <span className="bar-value">{overall[p].toFixed(1)}</span>
              </div>
              <div
                className="bar north"
                style={{ width: `${(byDirection.North[p] / maxValue) * 100}%` }}
              >
                <span className="bar-value">{byDirection.North[p].toFixed(1)}</span>
              </div>
              <div
                className="bar south"
                style={{ width: `${(byDirection.South[p] / maxValue) * 100}%` }}
              >
                <span className="bar-value">{byDirection.South[p].toFixed(1)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
