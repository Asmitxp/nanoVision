import React from 'react';
import { 
  HelpCircle, 
  X, 
  Ruler, 
  Layers, 
  Activity, 
  Shapes, 
  ShieldCheck, 
  FileText 
} from 'lucide-react';

export default function MetrologyGuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog glass-panel" style={{ maxWidth: '680px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div className="modal-header-icon-title">
            <HelpCircle size={20} className="text-cyan" />
            <h3 className="modal-title">NanoVision Metrology & Calibration Guide</h3>
          </div>
          <button className="btn-close" onClick={onClose} id="btn-close-guide-modal"><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto' }}>
          {/* Section 1 */}
          <div className="guide-section">
            <div className="guide-sec-header">
              <Ruler size={16} className="text-cyan" />
              <h4>1. Scale Bar Calibration</h4>
            </div>
            <p>
              Micrographs lack intrinsic spatial metadata. To determine true physical dimensions, NanoVision calculates the calibration factor:
            </p>
            <div className="formula-box font-mono">
              Scale Factor (nm/px) = Known Physical Bar Length (nm) / Measured Bar Length (pixels)
            </div>
            <p>
              Use the <strong>"Measure Scale Bar"</strong> ruler tool on the micrograph toolbar to drag across the scale bar, or click <strong>"Auto Scale"</strong> for automatic line detection.
            </p>
          </div>

          {/* Section 2 */}
          <div className="guide-section">
            <div className="guide-sec-header">
              <Layers size={16} className="text-emerald" />
              <h4>2. Marker-Controlled Watershed Declustering</h4>
            </div>
            <p>
              Nanoparticles frequently touch or agglomerate on TEM carbon grids and SEM substrates. Simple thresholding lumps touching particles into a single giant clump. 
              NanoVision utilizes:
            </p>
            <ul className="guide-list">
              <li><strong>Euclidean Distance Transform:</strong> Maps each pixel to its distance from the background edge.</li>
              <li><strong>Topological Local Maxima:</strong> Identifies individual particle seeds (sure foreground).</li>
              <li><strong>Watershed Flooding:</strong> Floods the morphological gradient landscape to construct boundary ridges exactly along touching contacts.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="guide-section">
            <div className="guide-sec-header">
              <Activity size={16} className="text-violet" />
              <h4>3. Polydispersity Index (PDI) Standards</h4>
            </div>
            <p>
              In colloid science and nanomaterials synthesis, size distribution uniformity is quantified via the dimensionless Polydispersity Index:
            </p>
            <div className="formula-box font-mono">
              PDI = (Standard Deviation σ / Mean Diameter μ)²
            </div>
            <div className="pdi-table-guide">
              <div className="pdi-row"><span className="badge badge-emerald">PDI &lt; 0.05</span> <span><strong>Monodisperse:</strong> Uniform crystal growth, narrow distribution.</span></div>
              <div className="pdi-row"><span className="badge badge-cyan">0.05 ≤ PDI ≤ 0.25</span> <span><strong>Moderate Polydispersity:</strong> Acceptable for colloidal formulations.</span></div>
              <div className="pdi-row"><span className="badge badge-amber">PDI &gt; 0.25</span> <span><strong>Broad / Agglomerated:</strong> Bimodal or uneven nucleation.</span></div>
            </div>
          </div>

          {/* Section 4 */}
          <div className="guide-section">
            <div className="guide-sec-header">
              <Shapes size={16} className="text-amber" />
              <h4>4. Geometric Particle Metrics</h4>
            </div>
            <ul className="guide-list">
              <li><strong>Equivalent Spherical Diameter (d_eq):</strong> 2 × √(Area / π)</li>
              <li><strong>Circularity:</strong> (4π × Area) / Perimeter² (Values close to 1.0 indicate perfect spheres; &lt; 0.7 indicates irregular or clustered particles).</li>
              <li><strong>Feret Max:</strong> The maximum caliper distance between two parallel tangents.</li>
            </ul>
          </div>

          {/* Section 5 */}
          <div className="guide-section">
            <div className="guide-sec-header">
              <ShieldCheck size={16} className="text-cyan" />
              <h4>5. ISO 13322-1 & ASTM E2859 Compliance</h4>
            </div>
            <p>
              NanoVision reports follow the international standard <strong>ISO 13322-1</strong> (Particle size analysis — Static image analysis methods) and <strong>ASTM E2859</strong> for electron microscopy nanoparticle sizing.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Got It</button>
        </div>
      </div>
    </div>
  );
}
