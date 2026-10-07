import React, { useState, useRef, useEffect } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  Ruler, 
  Eye, 
  Crosshair, 
  Info,
  Check,
  X,
  Layers,
  Sparkles
} from 'lucide-react';

export default function MicrographViewer({
  rawImage,
  annotatedImage,
  maskImage,
  particles = [],
  scaleUnit = 'nm',
  scalePixels,
  scaleDistance,
  onUpdateCalibration,
  selectedParticleId,
  onSelectParticle,
  onAutoCalibrate,
  isAutoCalibrating
}) {
  const [viewMode, setViewMode] = useState('annotated'); // 'annotated', 'raw', 'mask', 'split'
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Calibration Ruler State
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [rulerPoints, setRulerPoints] = useState(null); // { start: {x, y}, end: {x, y} }
  const [calibModalOpen, setCalibModalOpen] = useState(false);
  const [measuredPx, setMeasuredPx] = useState(0);
  const [newDistance, setNewDistance] = useState(scaleDistance || 50);
  const [newUnit, setNewUnit] = useState(scaleUnit || 'nm');

  // Hovered particle
  const [hoveredParticle, setHoveredParticle] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Reset zoom & pan when image changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [rawImage]);

  // Handle Zoom
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.3, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.3, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Pan handlers
  const handleMouseDown = (e) => {
    if (isCalibrating) {
      const rect = imageRef.current.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) / zoom;
      const clickY = (e.clientY - rect.top) / zoom;
      setRulerPoints({
        start: { x: clickX, y: clickY },
        end: { x: clickX, y: clickY }
      });
      return;
    }

    if (e.button === 0) { // Left click
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const currX = (e.clientX - rect.left) / zoom;
    const currY = (e.clientY - rect.top) / zoom;
    setMousePos({ x: Math.round(currX), y: Math.round(currY) });

    if (isCalibrating && rulerPoints) {
      setRulerPoints(prev => ({
        ...prev,
        end: { x: currX, y: currY }
      }));
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      });
      return;
    }

    // Check if hovering near a particle centroid
    if (particles && particles.length > 0 && !isCalibrating) {
      let closest = null;
      let minDistance = 18; // hover threshold in pixels

      for (const p of particles) {
        const d = Math.hypot(p.cx - currX, p.cy - currY);
        if (d < minDistance) {
          minDistance = d;
          closest = p;
        }
      }
      setHoveredParticle(closest);
    }
  };

  const handleMouseUp = () => {
    if (isCalibrating && rulerPoints) {
      const dx = rulerPoints.end.x - rulerPoints.start.x;
      const dy = rulerPoints.end.y - rulerPoints.start.y;
      const dist = Math.round(Math.hypot(dx, dy));
      if (dist > 5) {
        setMeasuredPx(dist);
        setCalibModalOpen(true);
      }
    }
    setIsPanning(false);
  };

  const handleApplyCalibration = () => {
    if (measuredPx > 0 && newDistance > 0) {
      onUpdateCalibration(measuredPx, parseFloat(newDistance), newUnit);
      setCalibModalOpen(false);
      setIsCalibrating(false);
      setRulerPoints(null);
    }
  };

  const handleCancelCalibration = () => {
    setIsCalibrating(false);
    setRulerPoints(null);
    setCalibModalOpen(false);
  };

  // Determine current image source
  let currentSrc = rawImage;
  if (viewMode === 'annotated' && annotatedImage) currentSrc = annotatedImage;
  if (viewMode === 'mask' && maskImage) currentSrc = maskImage;

  return (
    <div className="viewer-card glass-panel">
      {/* Top Toolbar */}
      <div className="viewer-toolbar">
        {/* View Mode Switcher */}
        <div className="view-mode-group">
          <button 
            className={`view-mode-btn ${viewMode === 'annotated' ? 'active' : ''}`}
            onClick={() => setViewMode('annotated')}
            disabled={!annotatedImage}
            title="Display detected particle contours and color grading"
            id="viewmode-annotated"
          >
            <Sparkles size={14} />
            <span>Annotated</span>
          </button>

          <button 
            className={`view-mode-btn ${viewMode === 'raw' ? 'active' : ''}`}
            onClick={() => setViewMode('raw')}
            title="Display original unaltered electron micrograph"
            id="viewmode-raw"
          >
            <Eye size={14} />
            <span>Original</span>
          </button>

          <button 
            className={`view-mode-btn ${viewMode === 'mask' ? 'active' : ''}`}
            onClick={() => setViewMode('mask')}
            disabled={!maskImage}
            title="Display binary watershed segmentation mask"
            id="viewmode-mask"
          >
            <Layers size={14} />
            <span>Binary Mask</span>
          </button>
        </div>

        {/* Action Tools */}
        <div className="viewer-tools-group">
          {/* Ruler Calibration Tool */}
          <button 
            className={`btn-tool ${isCalibrating ? 'active-tool' : ''}`}
            onClick={() => {
              setIsCalibrating(!isCalibrating);
              setRulerPoints(null);
            }}
            title="Calibrate Scale Bar: Click & drag a ruler across the scale bar"
            id="btn-calibrate-ruler"
          >
            <Ruler size={16} />
            <span className="tool-text">{isCalibrating ? 'Click & Drag Ruler' : 'Measure Scale Bar'}</span>
          </button>

          {/* Auto Detect Scale Bar */}
          <button 
            className="btn-tool"
            onClick={onAutoCalibrate}
            disabled={isAutoCalibrating}
            title="Automatically detect scale bar line using computer vision"
            id="btn-auto-calibrate"
          >
            <Crosshair size={15} />
            <span className="tool-text">{isAutoCalibrating ? 'Detecting...' : 'Auto Scale'}</span>
          </button>

          <div className="divider-vert"></div>

          {/* Zoom controls */}
          <button className="btn-icon" onClick={handleZoomOut} title="Zoom Out" id="btn-zoom-out">
            <ZoomOut size={16} />
          </button>
          <span className="zoom-indicator">{Math.round(zoom * 100)}%</span>
          <button className="btn-icon" onClick={handleZoomIn} title="Zoom In" id="btn-zoom-in">
            <ZoomIn size={16} />
          </button>
          <button className="btn-icon" onClick={handleResetZoom} title="Reset View" id="btn-zoom-reset">
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* Micrograph Canvas Area */}
      <div 
        className={`micrograph-container grid-bg ${isCalibrating ? 'cursor-crosshair' : (isPanning ? 'cursor-grabbing' : 'cursor-grab')}`}
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsPanning(false);
          setHoveredParticle(null);
        }}
      >
        {currentSrc ? (
          <div 
            className="image-pan-wrapper"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.15s ease-out'
            }}
          >
            <img 
              ref={imageRef}
              src={currentSrc} 
              alt="Micrograph View" 
              className="micrograph-img"
              draggable={false}
            />

            {/* Scale Bar Ruler Drawing Overlay */}
            {isCalibrating && rulerPoints && (
              <svg className="ruler-svg-overlay">
                <line 
                  x1={rulerPoints.start.x} 
                  y1={rulerPoints.start.y} 
                  x2={rulerPoints.end.x} 
                  y2={rulerPoints.end.y} 
                  stroke="#38bdf8" 
                  strokeWidth="3" 
                  strokeDasharray="4 2"
                />
                <circle cx={rulerPoints.start.x} cy={rulerPoints.start.y} r="5" fill="#38bdf8" />
                <circle cx={rulerPoints.end.x} cy={rulerPoints.end.y} r="5" fill="#f43f5e" />
                <text 
                  x={(rulerPoints.start.x + rulerPoints.end.x) / 2} 
                  y={(rulerPoints.start.y + rulerPoints.end.y) / 2 - 10} 
                  fill="#ffffff" 
                  fontSize="13" 
                  fontWeight="bold"
                  textAnchor="middle"
                  className="ruler-text-shadow"
                >
                  {Math.round(Math.hypot(rulerPoints.end.x - rulerPoints.start.x, rulerPoints.end.y - rulerPoints.start.y))} px
                </text>
              </svg>
            )}

            {/* Particle highlight marker if selected from table */}
            {selectedParticleId && particles.find(p => p.id === selectedParticleId) && (
              (() => {
                const sp = particles.find(p => p.id === selectedParticleId);
                return (
                  <div 
                    className="selected-particle-ring"
                    style={{
                      left: `${sp.cx}px`,
                      top: `${sp.cy}px`,
                      width: `${Math.max(20, sp.diameter_px * 1.5)}px`,
                      height: `${Math.max(20, sp.diameter_px * 1.5)}px`
                    }}
                  />
                );
              })()
            )}
          </div>
        ) : (
          <div className="empty-viewport-message">
            <Layers size={48} className="empty-icon text-muted" />
            <p className="empty-title">No Micrograph Loaded</p>
            <p className="empty-subtitle">Select a sample specimen above or upload your own SEM/TEM image to begin.</p>
          </div>
        )}

        {/* Hovered Particle Quick Inspector Card */}
        {hoveredParticle && !isCalibrating && (
          <div 
            className="particle-hover-tooltip"
            style={{
              left: `${Math.min(containerRef.current?.clientWidth - 200, Math.max(20, mousePos.x * zoom + pan.x + 30))}px`,
              top: `${Math.min(containerRef.current?.clientHeight - 130, Math.max(20, mousePos.y * zoom + pan.y - 20))}px`
            }}
          >
            <div className="tooltip-header">
              <span className="tooltip-id">Particle #{hoveredParticle.id}</span>
              <span className="badge badge-cyan">{hoveredParticle.circularity >= 0.8 ? 'Spherical' : 'Irregular'}</span>
            </div>
            <div className="tooltip-grid">
              <div>
                <span className="tooltip-label">Diameter:</span>
                <span className="tooltip-val">{hoveredParticle.diameter} {scaleUnit}</span>
              </div>
              <div>
                <span className="tooltip-label">Circularity:</span>
                <span className="tooltip-val">{hoveredParticle.circularity}</span>
              </div>
              <div>
                <span className="tooltip-label">Aspect Ratio:</span>
                <span className="tooltip-val">{hoveredParticle.aspect_ratio}</span>
              </div>
              <div>
                <span className="tooltip-label">Feret Max:</span>
                <span className="tooltip-val">{hoveredParticle.feret_max} {scaleUnit}</span>
              </div>
            </div>
          </div>
        )}

        {/* Calibration instruction banner */}
        {isCalibrating && (
          <div className="calibration-banner">
            <Ruler size={16} />
            <span>Click and drag a line across the scale bar on the image to set physical calibration.</span>
            <button className="btn-tiny" onClick={handleCancelCalibration}>Cancel</button>
          </div>
        )}
      </div>

      {/* Bottom Status / HUD Readout */}
      <div className="viewer-statusbar">
        <div className="status-readout-item">
          <span className="status-label">Cursor:</span>
          <span className="status-value font-mono">X: {mousePos.x}px | Y: {mousePos.y}px</span>
        </div>

        <div className="status-readout-item">
          <span className="status-label">Scale:</span>
          <span className="status-value font-mono">
            {scalePixels} px = {scaleDistance} {scaleUnit} ({(scaleDistance / scalePixels).toFixed(3)} {scaleUnit}/px)
          </span>
        </div>

        <div className="status-readout-item">
          <span className="status-label">Detected:</span>
          <span className="status-value font-mono highlight-cyan">
            {particles.length} Particles
          </span>
        </div>
      </div>

      {/* Modal: Confirm Calibration after Ruler Measurement */}
      {calibModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog glass-panel">
            <div className="modal-header">
              <h3 className="modal-title">Scale Bar Calibration</h3>
              <button className="btn-close" onClick={handleCancelCalibration}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p className="modal-desc">
                Measured scale bar length: <strong className="highlight-cyan">{measuredPx} pixels</strong>.
                Specify the physical distance this line represents on your microscope:
              </p>

              <div className="grid-2-col">
                <div className="form-group">
                  <label className="form-label">Physical Length</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={newDistance} 
                    onChange={(e) => setNewDistance(e.target.value)}
                    min="0.1"
                    step="any"
                    id="input-calib-distance"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select 
                    className="form-select"
                    value={newUnit} 
                    onChange={(e) => setNewUnit(e.target.value)}
                    id="select-calib-unit"
                  >
                    <option value="nm">Nanometers (nm)</option>
                    <option value="µm">Micrometers (µm)</option>
                    <option value="pm">Picometers (pm)</option>
                    <option value="Å">Angstroms (Å)</option>
                    <option value="px">Pixels (px)</option>
                  </select>
                </div>
              </div>

              <div className="calibration-calculation-box">
                <div className="calc-item">
                  <span>New Scale Factor:</span>
                  <strong className="font-mono">{(newDistance / measuredPx).toFixed(4)} {newUnit} / pixel</strong>
                </div>
                <div className="calc-item">
                  <span>Pixels per Unit:</span>
                  <strong className="font-mono">{(measuredPx / newDistance).toFixed(2)} px / {newUnit}</strong>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleCancelCalibration}>Cancel</button>
              <button className="btn btn-primary" onClick={handleApplyCalibration} id="btn-save-calibration">
                <Check size={16} />
                <span>Apply Calibration</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
