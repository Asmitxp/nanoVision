import React from 'react';
import { 
  CircleDot, 
  Target, 
  Activity, 
  PieChart, 
  Layers, 
  Shapes, 
  Percent, 
  HelpCircle,
  TrendingUp,
  BarChart2
} from 'lucide-react';

export default function MetricsDashboard({ summary = {}, unit = 'nm' }) {
  if (!summary || summary.total_particles === undefined) {
    return null;
  }

  const pdi = summary.pdi || 0;
  let pdiBadgeClass = 'badge-emerald';
  let pdiLabel = 'Monodisperse';

  if (pdi > 0.25) {
    pdiBadgeClass = 'badge-amber';
    pdiLabel = 'Broad Distribution';
  } else if (pdi >= 0.05) {
    pdiBadgeClass = 'badge-cyan';
    pdiLabel = 'Moderate Polydispersity';
  }

  return (
    <div className="metrics-dashboard-grid">
      {/* Card 1: Total Particles */}
      <div className="metric-card glass-panel">
        <div className="metric-header">
          <span className="metric-title">Detected Particles</span>
          <CircleDot size={18} className="metric-icon text-cyan" />
        </div>
        <div className="metric-value-row">
          <span className="metric-value highlight-cyan">{summary.total_particles}</span>
          <span className="metric-unit">particles</span>
        </div>
        <div className="metric-footer">
          <span className="text-muted">Edge-excluded count</span>
        </div>
      </div>

      {/* Card 2: Mean Diameter & Std Dev */}
      <div className="metric-card glass-panel">
        <div className="metric-header">
          <span className="metric-title">Mean Diameter (μ)</span>
          <Target size={18} className="metric-icon text-emerald" />
        </div>
        <div className="metric-value-row">
          <span className="metric-value">{summary.mean_diameter}</span>
          <span className="metric-unit">{unit}</span>
        </div>
        <div className="metric-footer">
          <span className="metric-subval font-mono">± {summary.std_deviation} {unit} (1σ)</span>
        </div>
      </div>

      {/* Card 3: Polydispersity Index (PDI) */}
      <div className="metric-card glass-panel">
        <div className="metric-header">
          <span className="metric-title">Polydispersity Index</span>
          <Activity size={18} className="metric-icon text-violet" />
        </div>
        <div className="metric-value-row">
          <span className="metric-value font-mono">{pdi.toFixed(4)}</span>
          <span className={`badge ${pdiBadgeClass}`}>{pdiLabel}</span>
        </div>
        <div className="metric-footer">
          <span className="text-muted">PDI = (σ/μ)² standard</span>
        </div>
      </div>

      {/* Card 4: D50 & Mode */}
      <div className="metric-card glass-panel">
        <div className="metric-header">
          <span className="metric-title">Median D50 / Mode</span>
          <BarChart2 size={18} className="metric-icon text-blue" />
        </div>
        <div className="metric-value-row">
          <span className="metric-value">{summary.median_diameter}</span>
          <span className="metric-unit">{unit}</span>
        </div>
        <div className="metric-footer">
          <span className="text-muted">Peak Mode: <strong className="font-mono text-primary">{summary.mode_diameter} {unit}</strong></span>
        </div>
      </div>

      {/* Card 5: D10 / D90 & Span */}
      <div className="metric-card glass-panel">
        <div className="metric-header">
          <span className="metric-title">D10 / D90 & Span</span>
          <TrendingUp size={18} className="metric-icon text-cyan" />
        </div>
        <div className="metric-value-row">
          <span className="metric-value font-mono">{summary.d10} / {summary.d90}</span>
          <span className="metric-unit">{unit}</span>
        </div>
        <div className="metric-footer">
          <span className="text-muted">Span: <strong className="font-mono text-primary">{summary.span}</strong></span>
        </div>
      </div>

      {/* Card 6: Morphology & Circularity */}
      <div className="metric-card glass-panel">
        <div className="metric-header">
          <span className="metric-title">Mean Circularity</span>
          <Shapes size={18} className="metric-icon text-emerald" />
        </div>
        <div className="metric-value-row">
          <span className="metric-value font-mono">{summary.mean_circularity}</span>
          <span className="metric-unit">/ 1.00</span>
        </div>
        <div className="metric-footer">
          <span className="text-muted">Aspect Ratio: <strong className="font-mono text-primary">{summary.mean_aspect_ratio}</strong></span>
        </div>
      </div>

      {/* Card 7: Micrograph Surface Coverage */}
      <div className="metric-card glass-panel">
        <div className="metric-header">
          <span className="metric-title">Surface Coverage</span>
          <Percent size={18} className="metric-icon text-violet" />
        </div>
        <div className="metric-value-row">
          <span className="metric-value">{summary.total_area_coverage_pct}%</span>
          <span className="metric-unit">area</span>
        </div>
        <div className="metric-footer">
          <span className="text-muted">Total particle projected area</span>
        </div>
      </div>

      {/* Card 8: Calibrated Pixel Resolution */}
      <div className="metric-card glass-panel">
        <div className="metric-header">
          <span className="metric-title">Metrology Scale</span>
          <Layers size={18} className="metric-icon text-amber" />
        </div>
        <div className="metric-value-row">
          <span className="metric-value font-mono text-amber" style={{ fontSize: '1.25rem' }}>
            {summary.unit_per_pixel}
          </span>
          <span className="metric-unit">{unit}/px</span>
        </div>
        <div className="metric-footer">
          <span className="text-muted">Field of view: {Math.round(summary.image_width_px * summary.unit_per_pixel)} × {Math.round(summary.image_height_px * summary.unit_per_pixel)} {unit}</span>
        </div>
      </div>
    </div>
  );
}
