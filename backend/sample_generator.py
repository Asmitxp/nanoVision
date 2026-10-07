"""
Micrograph Sample Generator
Generates realistic SEM and TEM synthetic micrographs with authentic support films,
electron shot noise, scale bars, and calibrated nanoparticle populations.
"""

import cv2
import numpy as np
import math
import random
from typing import Dict, Any, List


def generate_micrograph_sample(sample_type: str = "aunp") -> Dict[str, Any]:
    """
    Generate a high-quality micrograph representing a specific nanoparticle specimen.
    Types:
      - 'aunp': Gold nanoparticles (TEM, monodisperse spheres, ~15 nm)
      - 'agnp': Silver nanoparticles (TEM, moderate polydispersity, ~30 nm)
      - 'tio2': Titanium dioxide (SEM, agglomerated/clustered, ~45 nm)
      - 'cqd': Carbon Quantum Dots (HR-TEM, ultra-small, ~4 nm)
      - 'silica': Silica Nanospheres (SEM, monodisperse large, ~180 nm)
    """
    width = 720
    height = 540

    # Seed for deterministic yet realistic output
    np.random.seed(42 if sample_type == "aunp" else (108 if sample_type == "agnp" else 777))
    random.seed(42 if sample_type == "aunp" else (108 if sample_type == "agnp" else 777))

    metadata = {}

    if sample_type == "aunp":
        # TEM: Bright carbon film background, dense dark gold spheres
        # 1 pixel = 0.2 nm -> 50 nm scale bar = 250 px
        scale_pixels = 250.0
        scale_distance = 50.0
        scale_unit = "nm"
        invert = True
        desc = "TEM Micrograph of Monodisperse Gold Nanoparticles (AuNPs) on Formvar/Carbon film"
        material = "Gold (Au)"
        method = "TEM (Transmission Electron Microscopy)"
        target_mean = 14.5  # nm
        target_std = 1.8    # nm

        # Base background: light grey with subtle carbon film texture
        bg = np.random.normal(215, 6, (height, width)).astype(np.float32)

        # Generate particles
        num_particles = 95
        px_mean = target_mean * (scale_pixels / scale_distance)
        px_std = target_std * (scale_pixels / scale_distance)

        particle_mask = np.zeros((height, width), dtype=np.float32)

        coords = []
        for _ in range(num_particles):
            # Diameter
            d = max(15.0, np.random.normal(px_mean, px_std))
            r = d / 2.0
            cx = random.uniform(d + 15, width - d - 15)
            cy = random.uniform(d + 15, height - 70 - d)

            # Avoid heavy overlap
            too_close = False
            for ocx, ocy, orad in coords:
                dist = math.hypot(cx - ocx, cy - ocy)
                if dist < (r + orad) * 0.75:
                    too_close = True
                    break
            if not too_close:
                coords.append((cx, cy, r))

        for cx, cy, r in coords:
            # Draw dark sphere with soft electron absorption gradient
            y_indices, x_indices = np.ogrid[:height, :width]
            dist_from_c = np.sqrt((x_indices - cx)**2 + (y_indices - cy)**2)
            inside = dist_from_c <= r
            # Optical density profile (darker in center, slight Fresnel fringe)
            absorption = np.clip(1.0 - (dist_from_c / max(1.0, r))**1.5, 0.0, 1.0) * 165
            bg[inside] = np.clip(bg[inside] - absorption[inside], 25, 255)

        # Add Gaussian electron microscope detector noise
        noise = np.random.normal(0, 7, (height, width))
        final_img = np.clip(bg + noise, 0, 255).astype(np.uint8)

    elif sample_type == "agnp":
        # TEM of Silver nanoparticles: slight non-spherical shapes, ~30 nm
        # 1 pixel = 0.4 nm -> 100 nm scale bar = 250 px
        scale_pixels = 250.0
        scale_distance = 100.0
        scale_unit = "nm"
        invert = True
        desc = "TEM Micrograph of Colloidal Silver Nanoparticles (AgNPs) with quasi-spherical geometry"
        material = "Silver (Ag)"
        method = "TEM"
        target_mean = 28.5
        target_std = 4.2

        bg = np.random.normal(205, 8, (height, width)).astype(np.float32)
        px_mean = target_mean * (scale_pixels / scale_distance)
        px_std = target_std * (scale_pixels / scale_distance)

        num_particles = 80
        for _ in range(num_particles):
            d = max(18.0, np.random.normal(px_mean, px_std))
            cx = int(random.uniform(d + 20, width - d - 20))
            cy = int(random.uniform(d + 20, height - 80 - d))
            axes = (int(d / 2.0), int((d / 2.0) * random.uniform(0.85, 1.15)))
            angle = random.uniform(0, 180)
            cv2.ellipse(bg, (cx, cy), axes, angle, 0, 360, (random.uniform(40, 70)), -1)

        # Blur and noise
        bg = cv2.GaussianBlur(bg, (3, 3), 0.8)
        noise = np.random.normal(0, 9, (height, width))
        final_img = np.clip(bg + noise, 0, 255).astype(np.uint8)

    elif sample_type == "tio2":
        # SEM of Titanium Dioxide: High clustering / agglomeration, light on dark
        # 1 pixel = 0.5 nm -> 100 nm scale bar = 200 px
        scale_pixels = 200.0
        scale_distance = 100.0
        scale_unit = "nm"
        invert = False
        desc = "SEM Micrograph of Clustered TiO2 Nanoparticles (Demonstrating Watershed De-agglomeration)"
        material = "Titanium Dioxide (TiO2)"
        method = "FE-SEM (Field Emission SEM)"
        target_mean = 46.0
        target_std = 8.5

        # Dark substrate background (silicon wafer with secondary electron noise)
        bg = np.random.normal(45, 10, (height, width)).astype(np.float32)
        px_mean = target_mean * (scale_pixels / scale_distance)
        px_std = target_std * (scale_pixels / scale_distance)

        # Generate clusters
        clusters = [
            (200, 180, 25),
            (380, 220, 35),
            (540, 190, 20),
            (290, 340, 28),
            (480, 360, 22)
        ]

        for cl_x, cl_y, count in clusters:
            for _ in range(count):
                d = max(14.0, np.random.normal(px_mean, px_std))
                cx = int(cl_x + random.gauss(0, 55))
                cy = int(cl_y + random.gauss(0, 45))
                if 20 <= cx < width - 20 and 20 <= cy < height - 80:
                    axes = (int(d / 2.0), int((d / 2.0) * random.uniform(0.8, 1.2)))
                    angle = random.uniform(0, 180)
                    cv2.ellipse(bg, (cx, cy), axes, angle, 0, 360, (random.uniform(190, 245)), -1)

        bg = cv2.GaussianBlur(bg, (5, 5), 1.2)
        noise = np.random.normal(0, 12, (height, width))
        final_img = np.clip(bg + noise, 0, 255).astype(np.uint8)

    elif sample_type == "cqd":
        # HR-TEM Carbon Quantum Dots: very small (~3.8 nm), 10 nm scale bar = 200 px
        scale_pixels = 200.0
        scale_distance = 10.0
        scale_unit = "nm"
        invert = True
        desc = "HR-TEM Micrograph of Carbon Quantum Dots (CQDs) showing sub-5nm quantum confinement"
        material = "Carbon Quantum Dots"
        method = "HR-TEM"
        target_mean = 3.6
        target_std = 0.6

        bg = np.random.normal(210, 10, (height, width)).astype(np.float32)
        px_mean = target_mean * (scale_pixels / scale_distance)
        px_std = target_std * (scale_pixels / scale_distance)

        num_particles = 110
        for _ in range(num_particles):
            d = max(8.0, np.random.normal(px_mean, px_std))
            cx = int(random.uniform(d + 15, width - d - 15))
            cy = int(random.uniform(d + 15, height - 70 - d))
            cv2.circle(bg, (cx, cy), int(d / 2.0), (random.uniform(55, 95)), -1)

        noise = np.random.normal(0, 14, (height, width))
        final_img = np.clip(bg + noise, 0, 255).astype(np.uint8)

    else:  # silica
        # Monodisperse Silica Nanospheres: large ~180 nm, 500 nm scale bar = 250 px
        scale_pixels = 250.0
        scale_distance = 500.0
        scale_unit = "nm"
        invert = False
        desc = "SEM Micrograph of Monodisperse Stöber Silica Nanospheres (SiO2)"
        material = "Silica (SiO2)"
        method = "SEM"
        target_mean = 182.0
        target_std = 7.2

        bg = np.random.normal(50, 7, (height, width)).astype(np.float32)
        px_mean = target_mean * (scale_pixels / scale_distance)
        px_std = target_std * (scale_pixels / scale_distance)

        num_particles = 45
        coords = []
        for _ in range(num_particles):
            d = max(35.0, np.random.normal(px_mean, px_std))
            r = d / 2.0
            cx = random.uniform(d + 20, width - d - 20)
            cy = random.uniform(d + 20, height - 80 - d)

            too_close = any(math.hypot(cx - ocx, cy - ocy) < (r + orad) * 0.9 for ocx, ocy, orad in coords)
            if not too_close:
                coords.append((cx, cy, r))

        for cx, cy, r in coords:
            cv2.circle(bg, (int(cx), int(cy)), int(r), (random.uniform(200, 240)), -1)

        bg = cv2.GaussianBlur(bg, (3, 3), 1.0)
        noise = np.random.normal(0, 8, (height, width))
        final_img = np.clip(bg + noise, 0, 255).astype(np.uint8)

    # Burn standard SEM/TEM footer databar & calibration line onto micrograph
    # Footer ribbon
    footer_h = 42
    footer_y = height - footer_h
    final_img[footer_y:height, :] = 25

    # Scale bar in footer
    bar_len = int(scale_pixels)
    bar_x = width - bar_len - 35
    bar_y = footer_y + 18
    cv2.line(final_img, (bar_x, bar_y), (bar_x + bar_len, bar_y), 255, 3)

    # Text metadata in footer
    scale_label = f"{int(scale_distance)} {scale_unit}"
    cv2.putText(final_img, scale_label, (bar_x + int(bar_len / 2) - 22, bar_y - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.42, 255, 1, cv2.LINE_AA)

    instrument_info = f"NanoVision SEM/TEM | HV: 200.0 kV | Mag: {int(500000 / (scale_distance / 50))}x | Specimen: {material}"
    cv2.putText(final_img, instrument_info, (20, footer_y + 26), cv2.FONT_HERSHEY_SIMPLEX, 0.38, 220, 1, cv2.LINE_AA)

    # Convert to 3-channel BGR
    bgr_img = cv2.cvtColor(final_img, cv2.COLOR_GRAY2BGR)

    metadata = {
        "id": sample_type,
        "name": f"{material} - {method}",
        "material": material,
        "microscopy": method,
        "description": desc,
        "scale_pixels": scale_pixels,
        "scale_distance": scale_distance,
        "scale_unit": scale_unit,
        "invert_colors": invert,
        "suggested_method": "watershed" if sample_type in ["tio2", "agnp"] else "otsu",
        "expected_mean_nm": target_mean,
        "expected_std_nm": target_std
    }

    return {
        "image": bgr_img,
        "metadata": metadata
    }
