"""
NanoVision Full-Stack FastAPI Backend
RESTful API for automated SEM/TEM nanoparticle characterization.
"""

import io
import csv
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import cv2
import numpy as np
import os

from cv_engine import NanoparticleAnalyzer
from sample_generator import generate_micrograph_sample
from report_generator import build_pdf_report

app = FastAPI(
    title="NanoVision API",
    description="AI & Computer Vision Platform for Automated Nanoparticle Characterization",
    version="1.0.0"
)

# Enable CORS for Vite frontend dev server and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

analyzer = NanoparticleAnalyzer()

# Cache generated sample micrographs
SAMPLE_CACHE = {}
SAMPLE_METADATA = [
    {
        "id": "aunp",
        "name": "Gold Nanoparticles (AuNPs)",
        "microscopy": "TEM (Bright-field)",
        "description": "Monodisperse spherical colloidal gold nanoparticles on carbon support film.",
        "scale_distance": 50,
        "scale_pixels": 250,
        "scale_unit": "nm",
        "invert_colors": True,
        "recommended_method": "watershed",
        "min_diameter_px": 8,
        "max_diameter_px": 120,
        "expected_mean": "14.5 ± 1.8 nm"
    },
    {
        "id": "agnp",
        "name": "Silver Nanoparticles (AgNPs)",
        "microscopy": "TEM Micrograph",
        "description": "Quasi-spherical colloidal silver nanoparticles with moderate polydispersity.",
        "scale_distance": 100,
        "scale_pixels": 250,
        "scale_unit": "nm",
        "invert_colors": True,
        "recommended_method": "watershed",
        "min_diameter_px": 10,
        "max_diameter_px": 150,
        "expected_mean": "28.5 ± 4.2 nm"
    },
    {
        "id": "tio2",
        "name": "Titanium Dioxide (TiO2)",
        "microscopy": "FE-SEM Micrograph",
        "description": "Agglomerated clustered nanoparticles demonstrating watershed de-clustering.",
        "scale_distance": 100,
        "scale_pixels": 200,
        "scale_unit": "nm",
        "invert_colors": False,
        "recommended_method": "watershed",
        "min_diameter_px": 6,
        "max_diameter_px": 180,
        "expected_mean": "46.0 ± 8.5 nm"
    },
    {
        "id": "cqd",
        "name": "Carbon Quantum Dots (CQDs)",
        "microscopy": "HR-TEM Micrograph",
        "description": "Ultra-small sub-5nm quantum dots exhibiting quantum confinement.",
        "scale_distance": 10,
        "scale_pixels": 200,
        "scale_unit": "nm",
        "invert_colors": True,
        "recommended_method": "watershed",
        "min_diameter_px": 4,
        "max_diameter_px": 90,
        "expected_mean": "3.6 ± 0.6 nm"
    },
    {
        "id": "silica",
        "name": "Stöber Silica Spheres (SiO2)",
        "microscopy": "SEM Micrograph",
        "description": "Uniform monodisperse silica nanospheres on silicon wafer substrate.",
        "scale_distance": 500,
        "scale_pixels": 250,
        "scale_unit": "nm",
        "invert_colors": False,
        "recommended_method": "otsu",
        "min_diameter_px": 15,
        "max_diameter_px": 250,
        "expected_mean": "182.0 ± 7.2 nm"
    }
]


def get_sample_image(sample_id: str) -> np.ndarray:
    """Retrieve or generate sample image."""
    if sample_id not in SAMPLE_CACHE:
        generated = generate_micrograph_sample(sample_id)
        SAMPLE_CACHE[sample_id] = generated["image"]
    return SAMPLE_CACHE[sample_id]


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "NanoVision AI Particle Characterization Engine",
        "version": "1.0.0"
    }


@app.get("/api/samples")
def list_samples():
    """List all available preloaded SEM/TEM sample specimens."""
    # Preload and create base64 preview thumbnails
    enriched = []
    for s in SAMPLE_METADATA:
        img = get_sample_image(s["id"])
        # Downscale for thumbnail
        thumb = cv2.resize(img, (240, 180), interpolation=cv2.INTER_AREA)
        thumb_b64 = analyzer.encode_image_base64(thumb, format=".jpeg")
        enriched.append({
            **s,
            "thumbnail": thumb_b64
        })
    return {"samples": enriched}


@app.get("/api/samples/{sample_id}/image")
def get_sample_raw(sample_id: str):
    """Retrieve full raw image of a specimen."""
    if sample_id not in [s["id"] for s in SAMPLE_METADATA]:
        raise HTTPException(status_code=404, detail="Sample not found")
    img = get_sample_image(sample_id)
    success, buffer = cv2.imencode(".png", img)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to encode image")
    return Response(content=buffer.tobytes(), media_type="image/png")


@app.post("/api/auto-calibrate")
async def auto_calibrate_image(
    file: Optional[UploadFile] = File(None),
    sample_id: Optional[str] = Form(None)
):
    """Detect scale bar in image and return suggested pixel length."""
    try:
        if file is not None:
            contents = await file.read()
            img = analyzer.decode_image(contents)
        elif sample_id:
            img = get_sample_image(sample_id)
        else:
            raise HTTPException(status_code=400, detail="Either file or sample_id required")

        result = analyzer.detect_scale_bar(img)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze")
async def analyze_micrograph(
    file: Optional[UploadFile] = File(None),
    sample_id: Optional[str] = Form(None),
    method: str = Form("watershed"),
    invert_colors: bool = Form(False),
    blur_kernel: int = Form(5),
    clahe_clip: float = Form(2.0),
    threshold_value: int = Form(128),
    watershed_distance_ratio: float = Form(0.45),
    min_diameter_px: float = Form(5.0),
    max_diameter_px: float = Form(250.0),
    min_circularity: float = Form(0.2),
    exclude_edges: bool = Form(True),
    scale_pixels: float = Form(100.0),
    scale_distance: float = Form(100.0),
    scale_unit: str = Form("nm"),
    hough_param2: int = Form(30)
):
    """Execute complete nanoparticle detection and characterization pipeline."""
    try:
        if file is not None:
            contents = await file.read()
            img = analyzer.decode_image(contents)
        elif sample_id:
            img = get_sample_image(sample_id)
        else:
            raise HTTPException(status_code=400, detail="Either file or sample_id required")

        result = analyzer.process_micrograph(
            image=img,
            method=method,
            invert_colors=invert_colors,
            blur_kernel=blur_kernel,
            clahe_clip=clahe_clip,
            threshold_value=threshold_value,
            watershed_distance_ratio=watershed_distance_ratio,
            min_diameter_px=min_diameter_px,
            max_diameter_px=max_diameter_px,
            min_circularity=min_circularity,
            exclude_edges=exclude_edges,
            scale_pixels=scale_pixels,
            scale_distance=scale_distance,
            scale_unit=scale_unit,
            hough_param2=hough_param2
        )
        return JSONResponse(content=result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/batch-analyze")
async def batch_analyze_samples(
    sample_ids: str = Form("aunp,agnp,tio2,cqd,silica"),
    method: str = Form("watershed")
):
    """Analyze multiple micrographs in batch and return comparative metrics."""
    ids = [i.strip() for i in sample_ids.split(",") if i.strip()]
    batch_results = []

    for sid in ids:
        matching_meta = next((s for s in SAMPLE_METADATA if s["id"] == sid), None)
        if not matching_meta:
            continue

        img = get_sample_image(sid)
        res = analyzer.process_micrograph(
            image=img,
            method=matching_meta.get("recommended_method", method),
            invert_colors=matching_meta.get("invert_colors", False),
            scale_pixels=matching_meta["scale_pixels"],
            scale_distance=matching_meta["scale_distance"],
            scale_unit=matching_meta["scale_unit"],
            min_diameter_px=matching_meta.get("min_diameter_px", 5),
            max_diameter_px=matching_meta.get("max_diameter_px", 250)
        )

        batch_results.append({
            "sample_id": sid,
            "sample_name": matching_meta["name"],
            "microscopy": matching_meta["microscopy"],
            "summary": res["summary"],
            "histogram": res["distribution"]["histogram"],
            "annotated_preview": res["annotated_image"]
        })

    return {"results": batch_results, "total_samples_analyzed": len(batch_results)}


@app.post("/api/export/pdf")
async def export_pdf_report(payload: dict):
    """Generate high-resolution laboratory characterization PDF certificate."""
    try:
        analysis_data = payload.get("analysis", {})
        sample_name = payload.get("sample_name", "Micrograph Specimen")
        operator_name = payload.get("operator_name", "NanoVision Researcher")
        instrument_name = payload.get("instrument_name", "SEM/TEM Electron Microscope")
        notes = payload.get("notes", "Automated computer-vision characterization.")

        pdf_bytes = build_pdf_report(
            analysis_result=analysis_data,
            sample_name=sample_name,
            operator_name=operator_name,
            instrument_name=instrument_name,
            notes=notes
        )

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="NanoVision_{sample_name.replace(" ", "_")}_Report.pdf"'}
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/export/csv")
async def export_csv_data(payload: dict):
    """Export individual particle measurements to CSV."""
    particles = payload.get("particles", [])
    unit = payload.get("unit", "nm")

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Particle_ID",
        f"Diameter_{unit}",
        "Diameter_px",
        f"Area_{unit}2",
        "Area_px2",
        "Circularity",
        "Aspect_Ratio",
        f"Feret_Max_{unit}",
        f"Feret_Min_{unit}",
        "Centroid_X_px",
        "Centroid_Y_px"
    ])

    for p in particles:
        writer.writerow([
            p.get("id"),
            p.get("diameter"),
            p.get("diameter_px"),
            p.get("area"),
            p.get("area_px"),
            p.get("circularity"),
            p.get("aspect_ratio"),
            p.get("feret_max"),
            p.get("feret_min"),
            p.get("cx"),
            p.get("cy")
        ])

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="NanoVision_Particle_Measurements.csv"'}
    )


# Mount static build folder if frontend is built
dist_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "dist")
if os.path.exists(dist_path):
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
