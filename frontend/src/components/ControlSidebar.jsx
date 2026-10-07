import React, { useRef } from 'react';
import { 
  Upload, 
  Play, 
  RefreshCw, 
  Sliders, 
  Settings2, 
  HelpCircle, 
  Crosshair, 
  Maximize, 
  FileUp, 
  Image as ImageIcon,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export default function ControlSidebar({
  params,
  setParams,
  onAnalyze,
  isAnalyzing,
  onFileUpload,
  sampleOptions = [],
  selectedSampleId,
  onSelectSample,
  onAutoCalibrate,
  isAutoCalibrating
}) {
  const fileInputRef = useRef(null);

  const handleChange = (key, value) => {
    setParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleResetDefaults = () => {
    setParams({
      method: 'watershed',
      invert_colors: true,
      blur_kernel: 5,
      clahe_clip: 2.0,
      threshold_value: 128,
      watershed_distance_ratio: 0.45,
      min_diameter_px: 5,
      max_diameter_px: 250,
      min_circularity: 0.2,
      exclude_edges: true,
      scale_pixels: 250,
      scale_distance: 50,
      scale_unit: 'nm',
      hough_param2: 30
    });
  };

  return (
    <aside className="sidebar-container glass-panel">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <Settings2 size={18} className="text-cyan" />
          <h2 className="sidebar-title">Analysis Parameters</h2>
        </div>
        <button 
          className="btn-icon-tiny" 
          onClick={handleResetDefaults}
          title="Reset Parameters to Scientific Defaults"
          id="btn-reset-params"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="sidebar-scrollable-content">
        {/* Section 1: Micrograph Image Source */}
        <div className="sidebar-section">
          <div className="section-label-row">
            <span className="section-label">1. Micrograph Input</span>
          </div>

          {/* Upload Button */}
          <div className="upload-box-wrapper">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/png,image/jpeg,image/tiff,image/bmp" 
              style={{ display: 'none' }} 
              id="file-upload-input"
            />
            <button 
              className="upload-dropzone"
              onClick={() => fileInputRef.current?.click()}
              type="button"
              id="btn-upload-dropzone"
            >
              <Upload size={20} className="upload-icon text-cyan" />
              <span className="upload-text">Upload SEM / TEM Image</span>
              <span className="upload-hint">Supports PNG, JPG, TIFF, BMP</span>
            </button>
          </div>

          {/* Quick Sample Selector */}
          <div className="form-group" style={{ marginTop: '10px' }}>
            <label className="form-label">
              <span>Or Choose Sample Micrograph</span>
            </label>
            <select 
              className="form-select"
              value={selectedSampleId || ''}
              onChange={(e) => onSelectSample(e.target.value)}
              id="select-sample-preset"
            >
              <option value="" disabled>-- Select a Standard Sample --</option>
              {sampleOptions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.microscopy})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 2: Scale Calibration */}
        <div className="sidebar-section">
          <div className="section-label-row">
            <span className="section-label">2. Scale & Metrology Calibration</span>
            <span className="badge badge-cyan">ISO 13322</span>
          </div>

          <div className="grid-2-col">
            <div className="form-group">
              <label className="form-label">
                <span>Scale Bar</span>
                <span className="form-value-badge">{params.scale_pixels} px</span>
              </label>
              <input 
                type="number" 
                className="form-input" 
                value={params.scale_pixels} 
                onChange={(e) => handleChange('scale_pixels', parseFloat(e.target.value) || 1)}
                min="1"
                id="input-scale-pixels"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Represents</span>
                <span className="form-value-badge">{params.scale_distance} {params.scale_unit}</span>
              </label>
              <input 
                type="number" 
                className="form-input" 
                value={params.scale_distance} 
                onChange={(e) => handleChange('scale_distance', parseFloat(e.target.value) || 1)}
                min="0.1"
                step="any"
                id="input-scale-distance"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Physical Measurement Unit</label>
            <select 
              className="form-select"
              value={params.scale_unit} 
              onChange={(e) => handleChange('scale_unit', e.target.value)}
              id="select-scale-unit"
            >
              <option value="nm">Nanometers (nm)</option>
              <option value="µm">Micrometers (µm)</option>
              <option value="pm">Picometers (pm)</option>
              <option value="Å">Angstroms (Å)</option>
            </select>
          </div>

          <div className="scale-conversion-readout">
            <span>Factor: </span>
            <strong className="font-mono text-cyan">
              {(params.scale_distance / params.scale_pixels).toFixed(4)} {params.scale_unit} / px
            </strong>
          </div>
        </div>

        {/* Section 3: Detection Algorithm */}
        <div className="sidebar-section">
          <div className="section-label-row">
            <span className="section-label">3. AI Segmentation Algorithm</span>
          </div>

          <div className="form-group">
            <select 
              className="form-select"
              value={params.method} 
              onChange={(e) => handleChange('method', e.target.value)}
              id="select-segmentation-method"
            >
              <option value="watershed">Marker-Controlled Watershed (Separates Clustered)</option>
              <option value="adaptive">Adaptive Gaussian (Handles Non-uniform Light)</option>
              <option value="otsu">Otsu Global Binarization (High Contrast)</option>
              <option value="hough">Hough Circles (Strict Colloidal Spheres)</option>
            </select>
          </div>

          {/* Invert Color Switch */}
          <div className="toggle-row">
            <div className="toggle-label-group">
              <span className="toggle-title">Invert Micrograph Polarity</span>
              <span className="toggle-subtitle">TEM (dark particles on bright film)</span>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={params.invert_colors} 
                onChange={(e) => handleChange('invert_colors', e.target.checked)}
                id="checkbox-invert-colors"
              />
              <span className="slider round"></span>
            </label>
          </div>
        </div>

        {/* Section 4: Watershed & Preprocessing Controls */}
        <div className="sidebar-section">
          <div className="section-label-row">
            <span className="section-label">4. Fine-Tuning & Declustering</span>
          </div>

          {/* Watershed Distance Ratio Slider */}
          {params.method === 'watershed' && (
            <div className="form-group">
              <label className="form-label">
                <span>Declustering Sensitivity</span>
                <span className="form-value-badge">{Math.round(params.watershed_distance_ratio * 100)}%</span>
              </label>
              <input 
                type="range" 
                className="form-range" 
                min="0.1" 
                max="0.85" 
                step="0.05"
                value={params.watershed_distance_ratio} 
                onChange={(e) => handleChange('watershed_distance_ratio', parseFloat(e.target.value))}
                id="slider-watershed-sensitivity"
              />
              <span className="range-caption">Higher values prevent over-segmenting touching particles.</span>
            </div>
          )}

          {/* CLAHE Contrast */}
          <div className="form-group">
            <label className="form-label">
              <span>CLAHE Contrast Enhancement</span>
              <span className="form-value-badge">{params.clahe_clip.toFixed(1)}</span>
            </label>
            <input 
              type="range" 
              className="form-range" 
              min="0.0" 
              max="5.0" 
              step="0.5"
              value={params.clahe_clip} 
              onChange={(e) => handleChange('clahe_clip', parseFloat(e.target.value))}
              id="slider-clahe-clip"
            />
          </div>

          {/* Bilateral Noise Smoothing */}
          <div className="form-group">
            <label className="form-label">
              <span>Bilateral Denoising Kernel</span>
              <span className="form-value-badge">{params.blur_kernel} px</span>
            </label>
            <input 
              type="range" 
              className="form-range" 
              min="1" 
              max="11" 
              step="2"
              value={params.blur_kernel} 
              onChange={(e) => handleChange('blur_kernel', parseInt(e.target.value))}
              id="slider-blur-kernel"
            />
          </div>
        </div>

        {/* Section 5: Exclusion & Morphology Filters */}
        <div className="sidebar-section">
          <div className="section-label-row">
            <span className="section-label">5. Morphology & Quality Filters</span>
          </div>

          <div className="grid-2-col">
            <div className="form-group">
              <label className="form-label">
                <span>Min Diam</span>
                <span className="form-value-badge">{params.min_diameter_px}px</span>
              </label>
              <input 
                type="number" 
                className="form-input" 
                value={params.min_diameter_px} 
                onChange={(e) => handleChange('min_diameter_px', parseFloat(e.target.value) || 1)}
                min="1"
                id="input-min-diam"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Max Diam</span>
                <span className="form-value-badge">{params.max_diameter_px}px</span>
              </label>
              <input 
                type="number" 
                className="form-input" 
                value={params.max_diameter_px} 
                onChange={(e) => handleChange('max_diameter_px', parseFloat(e.target.value) || 10)}
                min="5"
                id="input-max-diam"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <span>Min Circularity Threshold</span>
              <span className="form-value-badge">{params.min_circularity}</span>
            </label>
            <input 
              type="range" 
              className="form-range" 
              min="0.0" 
              max="0.8" 
              step="0.05"
              value={params.min_circularity} 
              onChange={(e) => handleChange('min_circularity', parseFloat(e.target.value))}
              id="slider-min-circularity"
            />
            <span className="range-caption">Filters out irregular non-particle debris (1.0 = perfect circle).</span>
          </div>

          <div className="toggle-row">
            <div className="toggle-label-group">
              <span className="toggle-title">Exclude Edge Boundary Particles</span>
              <span className="toggle-subtitle">Avoids truncated border particle errors</span>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={params.exclude_edges} 
                onChange={(e) => handleChange('exclude_edges', e.target.checked)}
                id="checkbox-exclude-edges"
              />
              <span className="slider round"></span>
            </label>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="sidebar-footer">
        <button 
          className="btn btn-primary btn-run-analysis"
          onClick={onAnalyze}
          disabled={isAnalyzing}
          id="btn-run-characterization"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw size={18} className="animate-spin-slow" />
              <span>Analyzing Micrograph...</span>
            </>
          ) : (
            <>
              <Play size={18} />
              <span>Run AI Characterization</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
