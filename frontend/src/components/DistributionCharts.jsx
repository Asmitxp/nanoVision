import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Scatter } from 'react-chartjs-2';
import { BarChart2, TrendingUp, ScatterChart, Info } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function DistributionCharts({ distribution = {}, summary = {}, particles = [], unit = 'nm' }) {
  const [activeChart, setActiveChart] = useState('distribution'); // 'distribution', 'cumulative', 'morphology'

  const histogram = distribution.histogram || [];
  const gaussianFit = distribution.gaussian_fit || [];
  const lognormalFit = distribution.lognormal_fit || [];
  const cumulative = distribution.cumulative || [];

  if (histogram.length === 0) {
    return (
      <div className="charts-card glass-panel empty-charts-state">
        <BarChart2 size={36} className="text-muted" />
        <p className="text-secondary">Run particle characterization to generate size distribution curves.</p>
      </div>
    );
  }

  // Common dark theme options
  const darkChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 12 },
          boxWidth: 14,
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        titleColor: '#38bdf8',
        bodyColor: '#f8fafc',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        titleFont: { family: 'Inter', weight: 'bold' },
        bodyFont: { family: 'JetBrains Mono', size: 12 }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } },
        title: {
          display: true,
          text: `Equivalent Spherical Diameter (${unit})`,
          color: '#cbd5e1',
          font: { family: 'Inter', size: 12, weight: '600' }
        }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } },
        title: {
          display: true,
          text: 'Particle Count',
          color: '#cbd5e1',
          font: { family: 'Inter', size: 12, weight: '600' }
        }
      }
    }
  };

  // 1. Histogram & Fitted Curves Data
  const labels = histogram.map(b => `${b.bin_center} ${unit}`);
  const counts = histogram.map(b => b.count);

  const distributionChartData = {
    labels,
    datasets: [
      {
        type: 'bar',
        label: `Measured Histogram (N=${summary.total_particles})`,
        data: counts,
        backgroundColor: 'rgba(56, 189, 248, 0.65)',
        borderColor: '#38bdf8',
        borderWidth: 1.5,
        borderRadius: 4,
        order: 2
      }
    ]
  };

  // 2. Cumulative Distribution Chart Data
  const cumLabels = cumulative.map(c => `${c.x} ${unit}`);
  const cumValues = cumulative.map(c => c.cumulative_pct);

  const cumulativeChartData = {
    labels: cumLabels,
    datasets: [
      {
        label: 'Cumulative Particle Frequency Q₀(x) %',
        data: cumValues,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 2.5,
        borderWidth: 2.5
      }
    ]
  };

  const cumulativeOptions = {
    ...darkChartOptions,
    scales: {
      ...darkChartOptions.scales,
      y: {
        ...darkChartOptions.scales.y,
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Cumulative Percentage (%)',
          color: '#10b981',
          font: { family: 'Inter', size: 12, weight: '600' }
        }
      }
    }
  };

  // 3. Morphology Scatter: Diameter vs Circularity
  const scatterPoints = particles.map(p => ({
    x: p.diameter,
    y: p.circularity,
    id: p.id,
    aspect: p.aspect_ratio
  }));

  const morphologyChartData = {
    datasets: [
      {
        label: 'Nanoparticles (Diameter vs Circularity)',
        data: scatterPoints,
        backgroundColor: 'rgba(139, 92, 246, 0.7)',
        borderColor: '#8b5cf6',
        pointRadius: 4,
        pointHoverRadius: 7
      }
    ]
  };

  const morphologyOptions = {
    ...darkChartOptions,
    plugins: {
      ...darkChartOptions.plugins,
      tooltip: {
        ...darkChartOptions.plugins.tooltip,
        callbacks: {
          label: (context) => {
            const raw = context.raw;
            return [
              `Particle #${raw.id}`,
              `Diameter: ${raw.x} ${unit}`,
              `Circularity: ${raw.y} (1.0 = sphere)`,
              `Aspect Ratio: ${raw.aspect}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        ...darkChartOptions.scales.x,
        title: {
          display: true,
          text: `Particle Diameter (${unit})`,
          color: '#cbd5e1',
          font: { family: 'Inter', size: 12, weight: '600' }
        }
      },
      y: {
        ...darkChartOptions.scales.y,
        min: 0,
        max: 1.05,
        title: {
          display: true,
          text: 'Circularity (4πA / P²)',
          color: '#a78bfa',
          font: { family: 'Inter', size: 12, weight: '600' }
        }
      }
    }
  };

  return (
    <div className="charts-card glass-panel">
      {/* Chart Navigation Tabs */}
      <div className="charts-header">
        <div className="chart-tabs-group">
          <button 
            className={`chart-tab ${activeChart === 'distribution' ? 'active' : ''}`}
            onClick={() => setActiveChart('distribution')}
            id="tab-chart-distribution"
          >
            <BarChart2 size={15} />
            <span>Size Distribution (Histogram)</span>
          </button>

          <button 
            className={`chart-tab ${activeChart === 'cumulative' ? 'active' : ''}`}
            onClick={() => setActiveChart('cumulative')}
            id="tab-chart-cumulative"
          >
            <TrendingUp size={15} />
            <span>Cumulative Curve Q₀(x)</span>
          </button>

          <button 
            className={`chart-tab ${activeChart === 'morphology' ? 'active' : ''}`}
            onClick={() => setActiveChart('morphology')}
            id="tab-chart-morphology"
          >
            <ScatterChart size={15} />
            <span>Morphology Map (Circularity vs Size)</span>
          </button>
        </div>

        {/* Curve Fit Legend Info */}
        {activeChart === 'distribution' && distribution.gaussian_params?.mean && (
          <div className="curve-fit-summary-badge">
            <span className="badge badge-cyan">
              Gaussian Peak: {distribution.gaussian_params.mean} {unit} (σ = {distribution.gaussian_params.std} {unit})
            </span>
          </div>
        )}
      </div>

      {/* Canvas Viewport */}
      <div className="chart-canvas-container">
        {activeChart === 'distribution' && (
          <Bar data={distributionChartData} options={darkChartOptions} />
        )}

        {activeChart === 'cumulative' && (
          <Line data={cumulativeChartData} options={cumulativeOptions} />
        )}

        {activeChart === 'morphology' && (
          <Scatter data={morphologyChartData} options={morphologyOptions} />
        )}
      </div>
    </div>
  );
}
