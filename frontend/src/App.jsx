import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ControlSidebar from './components/ControlSidebar';
import MicrographViewer from './components/MicrographViewer';
import MetricsDashboard from './components/MetricsDashboard';
import DistributionCharts from './components/DistributionCharts';
import ParticleTable from './components/ParticleTable';
import SampleGallery from './components/SampleGallery';
import BatchComparisonView from './components/BatchComparisonView';
import ExportModal from './components/ExportModal';
import MetrologyGuideModal from './components/MetrologyGuideModal';
import { apiUrl } from './apiConfig';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('analyzer'); // 'analyzer', 'samples', 'batch'
  const [backendOnline, setBackendOnline] = useState(false);
  const [samples, setSamples] = useState([]);
  const [selectedSampleId, setSelectedSampleId] = useState('aunp');
  const [customFile, setCustomFile] = useState(null);

  // Micrograph Visual State
  const [rawImageUrl, setRawImageUrl] = useState('');
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState('');
  const [maskImageUrl, setMaskImageUrl] = useState('');

  // Analysis Result
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAutoCalibrating, setIsAutoCalibrating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Focused Particle
  const [selectedParticleId, setSelectedParticleId] = useState(null);

  // Modals
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);

  // Core Parameters State
  const [params, setParams] = useState({
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

  // Check Backend Health & Fetch Samples
  useEffect(() => {
    const initApp = async () => {
      try {
        const healthRes = await fetch(apiUrl('/api/health'));
        if (healthRes.ok) {
          setBackendOnline(true);
        }

        const samplesRes = await fetch(apiUrl('/api/samples'));
        if (samplesRes.ok) {
          const data = await samplesRes.json();
          setSamples(data.samples || []);
          // Automatically trigger initial analysis on 'aunp'
          if (data.samples && data.samples.length > 0) {
            loadSampleAndAnalyze('aunp', data.samples);
          }
        }
      } catch (err) {
        console.error('Backend connection check failed:', err);
        setBackendOnline(false);
      }
    };
    initApp();
  }, []);

  // Helper to load sample and execute analysis
  const loadSampleAndAnalyze = async (sampleId, sampleList = samples) => {
    setSelectedSampleId(sampleId);
    setCustomFile(null);
    setSelectedParticleId(null);

    const s = sampleList.find(x => x.id === sampleId);
    let currentParams = { ...params };
    if (s) {
      currentParams = {
        ...currentParams,
        scale_pixels: s.scale_pixels,
        scale_distance: s.scale_distance,
        scale_unit: s.scale_unit,
        invert_colors: s.invert_colors,
        method: s.recommended_method || 'watershed',
        min_diameter_px: s.min_diameter_px || 5,
        max_diameter_px: s.max_diameter_px || 250
      };
      setParams(currentParams);
    }

    setRawImageUrl(apiUrl(`/api/samples/${sampleId}/image`));
    executeAnalysis(null, sampleId, currentParams);
  };

  // Execute Analysis API call
  const executeAnalysis = async (fileObj = customFile, sampleId = selectedSampleId, runParams = params) => {
    setIsAnalyzing(true);
    setErrorMsg('');
    try {
      const formData = new FormData();
      if (fileObj) {
        formData.append('file', fileObj);
      } else if (sampleId) {
        formData.append('sample_id', sampleId);
      } else {
        throw new Error('Please select or upload a micrograph');
      }

      // Append all parameters
      Object.entries(runParams).forEach(([k, v]) => {
        formData.append(k, v);
      });

      const res = await fetch(apiUrl('/api/analyze'), {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Analysis failed');
      }

      const result = await res.json();
      setAnalysisResult(result);
      setAnnotatedImageUrl(result.annotated_image);
      setMaskImageUrl(result.mask_image);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // User uploaded custom micrograph file
  const handleFileUpload = (file) => {
    setCustomFile(file);
    setSelectedSampleId(null);
    setSelectedParticleId(null);

    // Create local object URL for preview
    const localUrl = URL.createObjectURL(file);
    setRawImageUrl(localUrl);

    // Run analysis on uploaded file
    executeAnalysis(file, null, params);
  };

  // Calibration Ruler Update
  const handleUpdateCalibration = (newPx, newDist, newUnit) => {
    const updated = {
      ...params,
      scale_pixels: newPx,
      scale_distance: newDist,
      scale_unit: newUnit
    };
    setParams(updated);
    // Re-run analysis with updated physical calibration factor
    executeAnalysis(customFile, selectedSampleId, updated);
  };

  // Auto Detect Scale Bar
  const handleAutoCalibrate = async () => {
    setIsAutoCalibrating(true);
    try {
      const formData = new FormData();
      if (customFile) {
        formData.append('file', customFile);
      } else if (selectedSampleId) {
        formData.append('sample_id', selectedSampleId);
      }

      const res = await fetch(apiUrl('/api/auto-calibrate'), {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Scale bar auto-detection failed');
      const data = await res.json();

      if (data.detected && data.suggested_pixels) {
        const updated = {
          ...params,
          scale_pixels: data.suggested_pixels
        };
        setParams(updated);
        executeAnalysis(customFile, selectedSampleId, updated);
      } else {
        alert('Could not automatically identify scale bar. Please use the "Measure Scale Bar" ruler tool to calibrate manually.');
      }
    } catch (err) {
      alert('Auto-calibration error: ' + err.message);
    } finally {
      setIsAutoCalibrating(false);
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    if (!analysisResult) return;
    try {
      const payload = {
        particles: analysisResult.particles || [],
        unit: params.scale_unit
      };
      const res = await fetch(apiUrl('/api/export/csv'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('CSV generation failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NanoVision_Particle_Measurements.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendOnline={backendOnline}
        onOpenExport={() => setExportModalOpen(true)}
        onOpenGuide={() => setGuideModalOpen(true)}
        isAnalyzing={isAnalyzing}
        hasResults={Boolean(analysisResult)}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {/* TAB 1: Micrograph Analyzer */}
        {activeTab === 'analyzer' && (
          <div className="analyzer-layout">
            {/* Left Control Sidebar */}
            <ControlSidebar 
              params={params}
              setParams={setParams}
              onAnalyze={() => executeAnalysis(customFile, selectedSampleId, params)}
              isAnalyzing={isAnalyzing}
              onFileUpload={handleFileUpload}
              sampleOptions={samples}
              selectedSampleId={selectedSampleId}
              onSelectSample={(sid) => loadSampleAndAnalyze(sid)}
              onAutoCalibrate={handleAutoCalibrate}
              isAutoCalibrating={isAutoCalibrating}
            />

            {/* Right Main Analysis Pane */}
            <div className="analysis-workspace">
              {errorMsg && (
                <div className="error-banner glass-panel">
                  <span>Error: {errorMsg}</span>
                </div>
              )}

              {/* Interactive Micrograph Viewer */}
              <MicrographViewer 
                rawImage={rawImageUrl}
                annotatedImage={annotatedImageUrl}
                maskImage={maskImageUrl}
                particles={analysisResult?.particles || []}
                scaleUnit={params.scale_unit}
                scalePixels={params.scale_pixels}
                scaleDistance={params.scale_distance}
                onUpdateCalibration={handleUpdateCalibration}
                selectedParticleId={selectedParticleId}
                onSelectParticle={setSelectedParticleId}
                onAutoCalibrate={handleAutoCalibrate}
                isAutoCalibrating={isAutoCalibrating}
              />

              {/* Statistical Metrics Cards */}
              <MetricsDashboard 
                summary={analysisResult?.summary}
                unit={params.scale_unit}
              />

              {/* Distribution Histograms & Curve Fits */}
              <DistributionCharts 
                distribution={analysisResult?.distribution}
                summary={analysisResult?.summary}
                particles={analysisResult?.particles || []}
                unit={params.scale_unit}
              />

              {/* Individual Particle Data Table */}
              <ParticleTable 
                particles={analysisResult?.particles || []}
                unit={params.scale_unit}
                selectedParticleId={selectedParticleId}
                onSelectParticle={setSelectedParticleId}
                onExportCsv={handleExportCsv}
              />
            </div>
          </div>
        )}

        {/* TAB 2: Sample Gallery */}
        {activeTab === 'samples' && (
          <SampleGallery 
            samples={samples}
            activeSampleId={selectedSampleId}
            onSelectAndAnalyze={(sid) => {
              loadSampleAndAnalyze(sid);
              setActiveTab('analyzer');
            }}
          />
        )}

        {/* TAB 3: Batch Comparison */}
        {activeTab === 'batch' && (
          <BatchComparisonView 
            onNavigateToSample={(sid) => {
              loadSampleAndAnalyze(sid);
              setActiveTab('analyzer');
            }}
          />
        )}
      </main>

      {/* Modals */}
      <ExportModal 
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        analysisResult={analysisResult}
        currentSampleName={samples.find(s => s.id === selectedSampleId)?.name || 'Micrograph Sample'}
      />

      <MetrologyGuideModal 
        isOpen={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
      />
    </div>
  );
}
