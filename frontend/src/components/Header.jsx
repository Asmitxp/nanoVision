import React from 'react';
import { 
  Atom, 
  Layers, 
  BarChart3, 
  Sliders, 
  FileText, 
  Download, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle,
  GitCompare,
  Sparkles
} from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  backendOnline, 
  onOpenExport, 
  onOpenGuide,
  isAnalyzing,
  hasResults
}) {
  return (
    <header className="header-wrapper">
      <div className="header-container">
        {/* Logo & Brand */}
        <div className="brand-group">
          <div className="logo-icon-box">
            <Atom className="logo-atom" size={28} />
            <span className="logo-pulse"></span>
          </div>
          <div>
            <div className="brand-title-row">
              <h1 className="brand-title">NanoVision<span className="brand-dot">.ai</span></h1>
              <span className="badge badge-cyan">v1.0 Metrology</span>
            </div>
            <p className="brand-subtitle">AI-Assisted Nanoparticle Characterization & Metrology Platform</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-tabs">
          <button 
            className={`nav-tab-btn ${activeTab === 'analyzer' ? 'active' : ''}`}
            onClick={() => setActiveTab('analyzer')}
            id="tab-analyzer"
          >
            <Sliders size={16} />
            <span>Micrograph Analyzer</span>
          </button>

          <button 
            className={`nav-tab-btn ${activeTab === 'samples' ? 'active' : ''}`}
            onClick={() => setActiveTab('samples')}
            id="tab-samples"
          >
            <Sparkles size={16} />
            <span>Sample Specimens</span>
          </button>

          <button 
            className={`nav-tab-btn ${activeTab === 'batch' ? 'active' : ''}`}
            onClick={() => setActiveTab('batch')}
            id="tab-batch"
          >
            <GitCompare size={16} />
            <span>Batch Comparison</span>
          </button>
        </nav>

        {/* Status & Quick Actions */}
        <div className="header-actions">
          <div className={`status-pill ${backendOnline ? 'online' : 'offline'}`} title="FastAPI Engine Status">
            <span className="status-dot"></span>
            <span>{backendOnline ? 'Engine Active' : 'Connecting...'}</span>
          </div>

          <button 
            className="btn btn-ghost" 
            onClick={onOpenGuide}
            title="Metrology Standards & User Guide"
            id="btn-guide"
          >
            <HelpCircle size={17} />
            <span className="hide-sm">Guide</span>
          </button>

          {hasResults && (
            <button 
              className="btn btn-primary" 
              onClick={onOpenExport}
              disabled={isAnalyzing}
              id="btn-export-report"
            >
              <Download size={16} />
              <span>Export Report</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
