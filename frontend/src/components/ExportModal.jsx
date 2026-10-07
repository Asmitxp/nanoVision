import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  X, 
  Check, 
  FileSpreadsheet, 
  Image, 
  FileCheck,
  Building,
  User,
  Cpu
} from 'lucide-react';
import { apiUrl } from '../apiConfig';

export default function ExportModal({ 
  isOpen, 
  onClose, 
  analysisResult, 
  currentSampleName = 'Nanoparticle Micrograph'
}) {
  const [sampleName, setSampleName] = useState(currentSampleName);
  const [operatorName, setOperatorName] = useState('Research Analyst');
  const [instrumentName, setInstrumentName] = useState('High-Resolution FE-SEM / TEM');
  const [notes, setNotes] = useState('Automated computer-vision characterization of nanoparticle size distribution.');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  if (!isOpen || !analysisResult) return null;

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const payload = {
        analysis: analysisResult,
        sample_name: sampleName,
        operator_name: operatorName,
        instrument_name: instrumentName,
        notes: notes
      };

      const res = await fetch(apiUrl('/api/export/pdf'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('PDF Generation failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NanoVision_${sampleName.replace(/\s+/g, '_')}_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert('Error downloading PDF: ' + err.message);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadCsv = async () => {
    try {
      const payload = {
        particles: analysisResult.particles || [],
        unit: analysisResult.summary?.unit || 'nm'
      };

      const res = await fetch(apiUrl('/api/export/csv'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('CSV Generation failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NanoVision_${sampleName.replace(/\s+/g, '_')}_Measurements.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert('Error downloading CSV: ' + err.message);
    }
  };

  const handleDownloadAnnotatedImage = () => {
    if (!analysisResult.annotated_image) return;
    const a = document.createElement('a');
    a.href = analysisResult.annotated_image;
    a.download = `NanoVision_${sampleName.replace(/\s+/g, '_')}_Annotated.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog glass-panel" style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <div className="modal-header-icon-title">
            <FileText size={20} className="text-cyan" />
            <h3 className="modal-title">Export Characterization Report</h3>
          </div>
          <button className="btn-close" onClick={onClose} id="btn-close-export-modal"><X size={18} /></button>
        </div>

        <div className="modal-body">
          <p className="modal-desc">
            Generate and download standard ISO 13322-1 metrology documentation, individual particle tabular data, or high-resolution annotated micrograph figures.
          </p>

          <div className="form-group">
            <label className="form-label">Sample / Formulation Identifier</label>
            <input 
              type="text" 
              className="form-input" 
              value={sampleName} 
              onChange={(e) => setSampleName(e.target.value)}
              id="input-export-sample-name"
            />
          </div>

          <div className="grid-2-col">
            <div className="form-group">
              <label className="form-label">Principal Operator / Analyst</label>
              <input 
                type="text" 
                className="form-input" 
                value={operatorName} 
                onChange={(e) => setOperatorName(e.target.value)}
                id="input-export-operator"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Microscope Instrument</label>
              <input 
                type="text" 
                className="form-input" 
                value={instrumentName} 
                onChange={(e) => setInstrumentName(e.target.value)}
                id="input-export-instrument"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Laboratory Remarks / Formulation Notes</label>
            <textarea 
              className="form-input" 
              rows={2} 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              id="textarea-export-notes"
            />
          </div>

          <div className="export-action-cards-grid">
            {/* PDF Report Option */}
            <div className="export-card primary-export">
              <div className="export-card-info">
                <FileCheck size={22} className="text-cyan" />
                <div>
                  <strong>Official PDF Certificate</strong>
                  <p>Includes micrograph, statistical table, curve fits, and standard certification.</p>
                </div>
              </div>
              <button 
                className="btn btn-primary"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                id="btn-download-pdf"
              >
                <Download size={15} />
                <span>{isExportingPdf ? 'Compiling PDF...' : 'Download PDF'}</span>
              </button>
            </div>

            {/* CSV Data Option */}
            <div className="export-card">
              <div className="export-card-info">
                <FileSpreadsheet size={22} className="text-emerald" />
                <div>
                  <strong>Raw Data CSV (N={analysisResult.particles?.length || 0})</strong>
                  <p>Individual particle IDs, diameters, circularities, areas, and Feret bounds.</p>
                </div>
              </div>
              <button 
                className="btn btn-secondary"
                onClick={handleDownloadCsv}
                id="btn-download-csv"
              >
                <Download size={15} />
                <span>Download CSV</span>
              </button>
            </div>

            {/* Annotated Micrograph PNG */}
            <div className="export-card">
              <div className="export-card-info">
                <Image size={22} className="text-violet" />
                <div>
                  <strong>Annotated Image (PNG)</strong>
                  <p>Export high-resolution micrograph with burned particle IDs and scale watermark.</p>
                </div>
              </div>
              <button 
                className="btn btn-secondary"
                onClick={handleDownloadAnnotatedImage}
                id="btn-download-png"
              >
                <Download size={15} />
                <span>Save Image</span>
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
