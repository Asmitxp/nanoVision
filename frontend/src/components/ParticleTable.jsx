import React, { useState, useMemo } from 'react';
import { 
  Table as TableIcon, 
  Search, 
  ArrowUpDown, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  CheckCircle,
  Eye
} from 'lucide-react';

export default function ParticleTable({ 
  particles = [], 
  unit = 'nm', 
  selectedParticleId, 
  onSelectParticle, 
  onExportCsv 
}) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('diameter');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Sorting and Filtering
  const filteredParticles = useMemo(() => {
    let result = [...particles];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(p => 
        p.id.toString().includes(q) || 
        p.diameter.toString().includes(q)
      );
    }

    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (valA === undefined) return 0;
      return sortAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    return result;
  }, [particles, search, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredParticles.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredParticles.slice(start, start + pageSize);
  }, [filteredParticles, currentPage, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  if (particles.length === 0) {
    return null;
  }

  return (
    <div className="table-card glass-panel">
      {/* Table Toolbar */}
      <div className="table-toolbar">
        <div className="table-title-group">
          <TableIcon size={17} className="text-cyan" />
          <h3 className="table-title">Individual Particle Measurements</h3>
          <span className="badge badge-cyan">{particles.length} Records</span>
        </div>

        <div className="table-actions-group">
          {/* Search */}
          <div className="table-search-box">
            <Search size={14} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search ID or size..." 
              value={search} 
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="table-search-input"
              id="input-particle-search"
            />
          </div>

          {/* Quick Export CSV */}
          <button 
            className="btn btn-secondary btn-sm"
            onClick={onExportCsv}
            title="Download CSV table of all particles"
            id="btn-table-export-csv"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="table-responsive-wrapper">
        <table className="particle-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id')} className="cursor-pointer">
                <div className="th-content">
                  <span>ID</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('diameter')} className="cursor-pointer">
                <div className="th-content">
                  <span>Diameter ({unit})</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('area')} className="cursor-pointer">
                <div className="th-content">
                  <span>Area ({unit}²)</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('circularity')} className="cursor-pointer">
                <div className="th-content">
                  <span>Circularity</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('aspect_ratio')} className="cursor-pointer">
                <div className="th-content">
                  <span>Aspect Ratio</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('feret_max')} className="cursor-pointer">
                <div className="th-content">
                  <span>Feret Max ({unit})</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th>Centroid (X, Y px)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((p) => {
              const isSelected = selectedParticleId === p.id;
              return (
                <tr 
                  key={p.id} 
                  className={`table-row ${isSelected ? 'row-selected' : ''}`}
                  onClick={() => onSelectParticle(p.id)}
                >
                  <td className="font-mono font-bold text-primary">#{p.id}</td>
                  <td>
                    <span className="font-mono text-cyan font-bold">{p.diameter}</span>
                  </td>
                  <td className="font-mono">{p.area}</td>
                  <td>
                    <span className={`badge ${p.circularity >= 0.8 ? 'badge-emerald' : 'badge-amber'}`}>
                      {p.circularity.toFixed(3)}
                    </span>
                  </td>
                  <td className="font-mono">{p.aspect_ratio}</td>
                  <td className="font-mono">{p.feret_max}</td>
                  <td className="font-mono text-muted">({p.cx}, {p.cy})</td>
                  <td>
                    <button 
                      className={`btn-table-action ${isSelected ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectParticle(isSelected ? null : p.id);
                      }}
                      title="Inspect particle in micrograph viewer"
                    >
                      <Eye size={13} />
                      <span>{isSelected ? 'Focused' : 'Locate'}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="table-pagination-footer">
        <span className="text-muted" style={{ fontSize: '0.8rem' }}>
          Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredParticles.length)} of {filteredParticles.length} particles
        </span>

        <div className="pagination-controls">
          <button 
            className="btn-icon-tiny" 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            title="Previous Page"
            id="btn-page-prev"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="pagination-page-indicator font-mono">
            {currentPage} / {totalPages}
          </span>
          <button 
            className="btn-icon-tiny" 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            title="Next Page"
            id="btn-page-next"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
