import React from 'react';
import { 
  Sparkles, 
  Layers, 
  ArrowRight, 
  Eye, 
  Sliders, 
  CheckCircle2, 
  Cpu
} from 'lucide-react';

export default function SampleGallery({ 
  samples = [], 
  onSelectAndAnalyze, 
  activeSampleId 
}) {
  return (
    <div className="gallery-container">
      <div className="gallery-header-banner glass-panel">
        <div className="gallery-title-box">
          <div className="gallery-badge-row">
            <span className="badge badge-cyan">Standard Datasets</span>
            <span className="badge badge-emerald">Ready for Instant Analysis</span>
          </div>
          <h2 className="gallery-title">Preloaded SEM & TEM Specimen Library</h2>
          <p className="gallery-desc">
            Explore authentic transmission and scanning electron micrographs with calibrated scale bars.
            Click any specimen below to immediately load parameters, detect nanoparticles, and generate size distribution statistics.
          </p>
        </div>
      </div>

      <div className="gallery-grid">
        {samples.map((sample) => {
          const isSelected = activeSampleId === sample.id;
          return (
            <div 
              key={sample.id} 
              className={`sample-card glass-panel ${isSelected ? 'sample-card-active' : ''}`}
            >
              {/* Thumbnail with overlay badge */}
              <div className="sample-thumbnail-wrapper">
                <img 
                  src={sample.thumbnail} 
                  alt={sample.name} 
                  className="sample-thumbnail-img" 
                />
                <div className="sample-microscopy-badge">
                  {sample.microscopy}
                </div>
                <div className="sample-scale-tag">
                  {sample.scale_distance} {sample.scale_unit}
                </div>
              </div>

              {/* Details */}
              <div className="sample-body">
                <h3 className="sample-name">{sample.name}</h3>
                <p className="sample-description">{sample.description}</p>

                <div className="sample-meta-grid">
                  <div className="sample-meta-item">
                    <span className="sample-meta-label">Expected Size:</span>
                    <span className="sample-meta-value font-mono text-cyan">{sample.expected_mean}</span>
                  </div>
                  <div className="sample-meta-item">
                    <span className="sample-meta-label">Recommended:</span>
                    <span className="sample-meta-value text-emerald">{sample.recommended_method}</span>
                  </div>
                </div>

                <div className="sample-action-row">
                  <button 
                    className="btn btn-primary btn-full-width"
                    onClick={() => onSelectAndAnalyze(sample.id)}
                    id={`btn-load-sample-${sample.id}`}
                  >
                    <span>Load & Analyze</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
