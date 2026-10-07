# 🔬 NanoVision — AI Nanoparticle Metrology Platform

> High-precision computer vision platform for automated SEM and TEM nanoparticle segmentation, scale calibration, size distribution analysis, and ISO 13322-1 compliant reporting.

---

## 🚀 Live Demo

- **Frontend (Vercel):** [https://frontend-alpha-two-41.vercel.app](https://frontend-alpha-two-41.vercel.app)

---

## 🛠️ Tech Stack & Architecture

- **Frontend:**
  - React 19 + Vite
  - Chart.js & React-Chartjs-2 (Size distribution histograms, Gaussian/Log-normal curve fits)
  - Lucide React icons
  - Custom responsive dark-mode scientific UI design

- **Backend:**
  - Python FastAPI
  - OpenCV (`cv2`) for image processing & watershed segmentation
  - SciPy for statistical distribution modeling
  - Matplotlib & ReportLab for publication-quality PDF reporting

---

## 📂 Project Structure

```text
├── backend/
│   ├── server.py              # FastAPI REST endpoints
│   ├── cv_engine.py           # Segmentation & metrology algorithms
│   ├── sample_generator.py    # Synthetic SEM/TEM micrographs
│   ├── report_generator.py    # ISO 13322-1 PDF generator
│   ├── Dockerfile             # Container configuration
│   ├── requirements.txt       # Python dependencies
│   ├── render.yaml            # Render blueprint config
│   └── Procfile               # Cloud deployment procfile
├── frontend/
│   ├── src/                   # React components & dashboard
│   ├── vercel.json            # Vercel SPA routing
│   ├── package.json           # Frontend dependencies
│   └── vite.config.js         # Vite configuration with proxy
└── README.md
```

---

## 💻 Local Development Setup

### 1. Backend (FastAPI)

```bash
cd backend
python -m pip install -r requirements.txt
python server.py
# Server runs on http://127.0.0.1:8000
```

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
# Vite runs on http://localhost:5173 with auto-proxy to backend
```

---

## ☁️ Deployment

- **Frontend:** Deployed on [Vercel](https://vercel.com) using `vercel.json` SPA rewrite rules.
- **Backend:** Ready for deployment on [Render](https://render.com) or [Railway](https://railway.app) via `render.yaml` or `Dockerfile`.
