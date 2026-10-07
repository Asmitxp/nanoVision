import React, { useState, useEffect } from 'react';
import { 
  GitCompare, 
  Play, 
  RefreshCw, 
  BarChart2, 
  Layers, 
  CheckCircle2, 
  Sparkles,
  Download
} from 'lucide-react';
import { apiUrl } from '../apiConfig';

export default function BatchComparisonView({ onNavigateToSample }) {
  const [batchData, setBatchData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runBatchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('sample_ids', 'aunp,agnp,tio2,cqd,silica');
      formData.append('method', 'watershed');

      const res = await fetch(apiUrl('/api/batch-analyze'), {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Failed to run batch analysis');
      const data = await res.json();
      setBatchData(data.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (batchData.length === 0) {
      runBatchAnalysis();
    }
  }, []);

  return (
    <div className="batch-view-container">
      {/* Banner */}
      <div className="batch-header-banner glass-panel">
        <div className="batch-title-row">
          <div className="batch-icon-box">
            <GitCompare size={24} className="text-cyan" />
          </div>
          <div>
            <h2 className="batch-title">Multi-Sample Batch Metrology Comparison</h2>
            <p className="batch-subtitle">
              Cross-sample statistical benchmarking across various nanoparticle chemistries, syntheses, and microscopy modalities.
            </p>
          </div>
        </div>

        <button 
          className="btn btn-primary"
          onClick={runBatchAnalysis}
          disabled={loading}
          id="btn-re-run-batch"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin-slow' : ''} />
          <span>{loading ? 'Processing Samples...' : 'Re-Run Batch Benchmarking'}</span>
        </button>
      </div>

      {error && (
        <div className="error-banner glass-panel">
          <span>{error}</span>
        </div>
      )}

      {/* Comparative Summary Table */}
      <div className="glass-panel batch-table-card">
        <div className="table-header-row">
          <h3 className="section-heading">Cross-Formulation Comparative Metrology</h3>
          <span className="badge badge-cyan">{batchData.length} Samples Analyzed</span>
        </div>

        <div className="table-responsive-wrapper">
          <table className="particle-table">
            <thead>
              <tr>
                <th>Sample / Specimen</th>
                <th>Microscopy</th>
                <th>Particles (N)</th>
                <th>Mean Diameter (μ ± 1σ)</th>
                <th>Median D50</th>
                <th>PDI (Polydispersity)</th>
                <th>Circularity</th>
                <th>Coverage %</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {batchData.map((b) => {
                const s = b.summary;
                return (
                  <tr key={b.sample_id} className="table-row">
                    <td>
                      <strong className="text-primary">{b.sample_name}</strong>
                    </td>
                    <td>
                      <span className="badge badge-cyan">{b.microscopy}</span>
                    </td>
                    <td className="font-mono font-bold highlight-cyan">{s.total_particles}</td>
                    <td className="font-mono">
                      {s.mean_diameter} ± {s.std_deviation} {s.unit}
                    </td>
                    <td className="font-mono">{s.median_diameter} {s.unit}</td>
                    <td>
                      <span className={`badge ${s.pdi < 0.05 ? 'badge-emerald' : (s.pdi <= 0.25 ? 'badge-cyan' : 'badge-amber')}`}>
                        {s.pdi} ({s.pdi_classification})
                      </span>
                    </td>
                    <td className="font-mono">{s.mean_circularity}</td>
                    <td className="font-mono">{s.total_area_coverage_pct}%</td>
                    <td>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => onNavigateToSample(b.sample_id)}
                      >
                        Deep Dive
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Micrograph Grid */}
      <div className="batch-cards-grid">
        {batchData.map((b) => (
          <div key={b.sample_id} className="batch-sample-card glass-panel">
            <div className="batch-card-img-wrapper">
              <img src={b.annotated_preview} alt={b.sample_name} className="batch-card-img" />
              <div className="batch-img-tag">{b.summary.total_particles} particles detected</div>
            </div>
            <div className="batch-card-body">
              <h4 className="batch-card-title">{b.sample_name}</h4>
              <div className="batch-quick-stats">
                <div>
                  <span className="text-muted">Mean: </span>
                  <strong className="font-mono">{b.summary.mean_diameter} {b.summary.unit}</strong>
                </div>
                <div>
                  <span className="text-muted">PDI: </span>
                  <strong className="font-mono">{b.summary.pdi}</strong>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
