"""
NanoVision Computer Vision Engine
High-precision nanoparticle segmentation, calibration, morphology & statistical distribution analysis.
"""

import cv2
import numpy as np
import base64
import math
from typing import Dict, Any, List, Tuple, Optional
from scipy.optimize import curve_fit


def gaussian(x, a, mu, sigma):
    """Gaussian curve model for particle size distribution fitting."""
    if sigma == 0:
        return np.zeros_like(x)
    return a * np.exp(-((x - mu) ** 2) / (2 * (sigma ** 2)))


def lognormal(x, a, mu, sigma):
    """Log-Normal curve model standard for colloidal nanoparticle distributions."""
    # Ensure x > 0
    safe_x = np.where(x > 0, x, 1e-6)
    if sigma == 0:
        return np.zeros_like(x)
    return (a / (safe_x * sigma * np.sqrt(2 * np.pi))) * np.exp(-((np.log(safe_x) - mu) ** 2) / (2 * (sigma ** 2)))


class NanoparticleAnalyzer:
    def __init__(self):
        pass

    @staticmethod
    def decode_image(image_bytes: bytes) -> np.ndarray:
        """Decode image bytes to BGR numpy array."""
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image bytes into valid OpenCV format.")
        return img

    @staticmethod
    def encode_image_base64(img: np.ndarray, format: str = ".png") -> str:
        """Encode OpenCV image to base64 data string."""
        success, encoded_img = cv2.imencode(format, img)
        if not success:
            raise ValueError("Failed to encode image to base64.")
        b64_string = base64.b64encode(encoded_img).decode("utf-8")
        mime = "image/png" if format == ".png" else "image/jpeg"
        return f"data:{mime};base64,{b64_string}"

    @staticmethod
    def detect_scale_bar(image: np.ndarray) -> Dict[str, Any]:
        """
        Heuristic scale bar detector:
        Microscopy SEM/TEM images usually have a horizontal solid bar near the bottom
        (bottom 15-20% of image height) with high contrast.
        """
        h, w = image.shape[:2]
        # Look in bottom 25% of image
        roi_top = int(h * 0.75)
        roi = image[roi_top:h, 0:w]
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY) if len(roi.shape) == 3 else roi

        # Look for crisp horizontal lines or solid bright/dark rectangular bars
        # Morphological horizontal kernel
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 3))
        # Threshold for both bright scale bar on dark background and dark on bright
        thresh_bright = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY)[1]
        thresh_dark = cv2.threshold(gray, 35, 255, cv2.THRESH_BINARY_INV)[1]

        candidates = []
        for thresh in [thresh_bright, thresh_dark]:
            opened = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
            contours, _ = cv2.findContours(opened, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for cnt in contours:
                x, y, bar_w, bar_h = cv2.boundingRect(cnt)
                # Typical scale bar: width between 30px and 0.6*w, height between 2px and 25px, aspect ratio > 4
                if 25 <= bar_w <= (w * 0.6) and 2 <= bar_h <= 30 and (bar_w / max(1, bar_h)) >= 3.5:
                    candidates.append({
                        "x": int(x),
                        "y": int(roi_top + y),
                        "width": int(bar_w),
                        "height": int(bar_h),
                        "length_pixels": int(bar_w),
                        "confidence": 0.85
                    })

        if candidates:
            # Pick the most prominent horizontal bar
            candidates.sort(key=lambda c: (c["width"] * c["height"]), reverse=True)
            best = candidates[0]
            return {
                "detected": True,
                "scale_bar": best,
                "suggested_pixels": best["length_pixels"]
            }

        # Fallback default estimation (e.g. 100 pixels)
        return {
            "detected": False,
            "scale_bar": None,
            "suggested_pixels": 100
        }

    def process_micrograph(
        self,
        image: np.ndarray,
        method: str = "watershed",  # "watershed", "adaptive", "otsu", "hough"
        invert_colors: bool = False,  # True if particles are dark on bright background (TEM)
        blur_kernel: int = 5,
        clahe_clip: float = 2.0,
        threshold_value: int = 128,  # for manual/custom or offset
        watershed_distance_ratio: float = 0.45,  # sensitivity of watershed peaks (0.1 to 0.9)
        min_diameter_px: float = 5.0,
        max_diameter_px: float = 250.0,
        min_circularity: float = 0.25,
        exclude_edges: bool = True,
        scale_pixels: float = 100.0,
        scale_distance: float = 100.0,
        scale_unit: str = "nm",
        hough_param2: int = 30
    ) -> Dict[str, Any]:
        """
        Complete processing pipeline for SEM/TEM nanoparticle analysis.
        """
        orig_h, orig_w = image.shape[:2]
        # Calculate pixel to physical calibration factor
        pixels_per_unit = (scale_pixels / scale_distance) if scale_distance > 0 else 1.0
        unit_per_pixel = (scale_distance / scale_pixels) if scale_pixels > 0 else 1.0

        # 1. Convert to Grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        # Invert if requested (e.g. TEM where nanoparticles are dense electron-absorbing dark spots)
        if invert_colors:
            gray = cv2.bitwise_not(gray)

        # 2. Contrast Enhancement (CLAHE - Contrast Limited Adaptive Histogram Equalization)
        if clahe_clip > 0:
            clahe = cv2.createCLAHE(clipLimit=clahe_clip, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)
        else:
            enhanced = gray.copy()

        # 3. Denoising / Smoothing
        k_size = blur_kernel if blur_kernel % 2 == 1 else blur_kernel + 1
        if k_size >= 3:
            # Bilateral filter preserves sharp particle boundaries while wiping electron detector grain noise
            blurred = cv2.bilateralFilter(enhanced, d=k_size, sigmaColor=75, sigmaSpace=75)
        else:
            blurred = enhanced.copy()

        # 4. Segmentation / Binarization
        if method == "adaptive":
            block_size = max(11, int(orig_w / 35))
            if block_size % 2 == 0:
                block_size += 1
            thresh = cv2.adaptiveThreshold(
                blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, block_size, 2
            )
        elif method == "otsu":
            _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        elif method == "manual":
            _, thresh = cv2.threshold(blurred, threshold_value, 255, cv2.THRESH_BINARY)
        else:
            # Default / Watershed: Otsu + morphological cleaning
            _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # Morphological noise cleanup (Opening: erosion followed by dilation)
        morph_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        clean_thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, morph_kernel, iterations=2)

        raw_contours = []
        watershed_markers_colored = None

        if method == "hough":
            # Hough Circles for strictly spherical colloids
            min_r = int(min_diameter_px / 2)
            max_r = int(max_diameter_px / 2)
            circles = cv2.HoughCircles(
                blurred,
                cv2.HOUGH_GRADIENT,
                dp=1.2,
                minDist=min_r * 1.8,
                param1=100,
                param2=hough_param2,
                minRadius=max(2, min_r),
                maxRadius=max(5, max_r)
            )
            hough_particles = []
            if circles is not None:
                circles = np.uint16(np.around(circles))
                for c in circles[0, :]:
                    cx, cy, r = int(c[0]), int(c[1]), int(c[2])
                    # Create contour approximation for circle
                    pts = cv2.ellipse2Poly((cx, cy), (r, r), 0, 0, 360, 10)
                    raw_contours.append(pts)
        elif method in ["watershed", "clahe_watershed"]:
            # Distance Transform + Watershed Segmentation
            # Sure background
            sure_bg = cv2.dilate(clean_thresh, morph_kernel, iterations=3)

            # Distance transform
            dist_transform = cv2.distanceTransform(clean_thresh, cv2.DIST_L2, 5)
            max_dist = dist_transform.max()
            if max_dist > 0:
                dist_ratio = max(0.05, min(0.95, watershed_distance_ratio))
                _, sure_fg = cv2.threshold(dist_transform, dist_ratio * max_dist, 255, 0)
                sure_fg = np.uint8(sure_fg)

                # Unknown region
                unknown = cv2.subtract(sure_bg, sure_fg)

                # Marker labelling
                num_markers, markers = cv2.connectedComponents(sure_fg)
                markers = markers + 1
                markers[unknown == 255] = 0

                # Apply watershed
                color_for_ws = image.copy()
                if len(color_for_ws.shape) == 2:
                    color_for_ws = cv2.cvtColor(color_for_ws, cv2.COLOR_GRAY2BGR)
                cv2.watershed(color_for_ws, markers)

                # Extract individual particle contours from each marker
                for marker_id in range(2, num_markers + 1):
                    particle_mask = np.uint8(markers == marker_id) * 255
                    cnts, _ = cv2.findContours(particle_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                    for cnt in cnts:
                        if cv2.contourArea(cnt) > 2:
                            raw_contours.append(cnt)
            else:
                cnts, _ = cv2.findContours(clean_thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                raw_contours = cnts
        else:
            # Direct contour detection on thresholded binary mask
            cnts, _ = cv2.findContours(clean_thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            raw_contours = cnts

        # 5. Particle Metrics Extraction & Filtering
        particles = []
        diameters_physical = []
        areas_physical = []
        circularities = []
        aspect_ratios = []

        annotated_img = image.copy()
        if len(annotated_img.shape) == 2:
            annotated_img = cv2.cvtColor(annotated_img, cv2.COLOR_GRAY2BGR)

        # Color palette for size grading:
        # Small: Cyan (255, 230, 0 in BGR)
        # Medium: Emerald Green (50, 220, 50 in BGR)
        # Large: Vivid Amber/Orange (0, 140, 255 in BGR)

        particle_counter = 0

        for cnt in raw_contours:
            area_px = cv2.contourArea(cnt)
            if area_px < 3:
                continue

            perimeter_px = cv2.arcLength(cnt, True)
            if perimeter_px <= 0:
                continue

            # Equivalent circular diameter
            diam_px = 2.0 * math.sqrt(area_px / math.pi)

            # Circularity (isoperimetric quotient) = 4 * pi * Area / Perimeter^2
            circularity = (4.0 * math.pi * area_px) / (perimeter_px ** 2)
            circularity = min(1.0, max(0.01, circularity))

            # Minimum Area Bounding Rectangle (Feret dimensions)
            rect = cv2.minAreaRect(cnt)
            rect_w, rect_h = rect[1]
            feret_max_px = max(rect_w, rect_h)
            feret_min_px = min(rect_w, rect_h)
            if feret_min_px > 0:
                aspect_ratio = feret_max_px / feret_min_px
            else:
                aspect_ratio = 1.0

            # Moments for Centroid
            M = cv2.moments(cnt)
            if M["m00"] != 0:
                cx = float(M["m10"] / M["m00"])
                cy = float(M["m01"] / M["m00"])
            else:
                cx = float(rect[0][0])
                cy = float(rect[0][1])

            # Edge exclusion filter: if particle touches any boundary
            if exclude_edges:
                x, y, w, h = cv2.boundingRect(cnt)
                if x <= 1 or y <= 1 or (x + w) >= orig_w - 2 or (y + h) >= orig_h - 2:
                    continue

            # Size & shape filters
            if diam_px < min_diameter_px or diam_px > max_diameter_px:
                continue

            if circularity < min_circularity:
                continue

            # Convert to physical units
            diam_phys = diam_px * unit_per_pixel
            area_phys = area_px * (unit_per_pixel ** 2)
            feret_max_phys = feret_max_px * unit_per_pixel
            feret_min_phys = feret_min_px * unit_per_pixel

            particle_counter += 1

            # Prepare simplified contour points for JSON transport (downsampled for lightweight transfer)
            epsilon = 0.015 * perimeter_px
            approx_cnt = cv2.approxPolyDP(cnt, epsilon, True)
            pts_list = [[int(pt[0][0]), int(pt[0][1])] for pt in approx_cnt]

            particle_data = {
                "id": particle_counter,
                "cx": round(cx, 1),
                "cy": round(cy, 1),
                "diameter": round(diam_phys, 2),
                "diameter_px": round(diam_px, 1),
                "area": round(area_phys, 2),
                "area_px": round(area_px, 1),
                "circularity": round(circularity, 3),
                "aspect_ratio": round(aspect_ratio, 2),
                "feret_max": round(feret_max_phys, 2),
                "feret_min": round(feret_min_phys, 2),
                "contour": pts_list
            }
            particles.append(particle_data)
            diameters_physical.append(diam_phys)
            areas_physical.append(area_phys)
            circularities.append(circularity)
            aspect_ratios.append(aspect_ratio)

        # 6. Annotate Visual Micrograph
        # Compute diameter quartiles for dynamic coloring
        if diameters_physical:
            q25 = float(np.percentile(diameters_physical, 30))
            q75 = float(np.percentile(diameters_physical, 70))
        else:
            q25, q75 = 0, 0

        for p in particles:
            d = p["diameter"]
            if d < q25:
                # Cyan (small)
                color = (255, 200, 0)
            elif d > q75:
                # Coral/Orange (large)
                color = (40, 120, 255)
            else:
                # Mint/Green (medium)
                color = (80, 220, 80)

            # Draw contour
            pts_np = np.array(p["contour"], dtype=np.int32).reshape((-1, 1, 2))
            cv2.drawContours(annotated_img, [pts_np], -1, color, 2)
            # Centroid
            cv2.circle(annotated_img, (int(p["cx"]), int(p["cy"])), 2, (255, 255, 255), -1)

            # Optional label on particles if total count is reasonable (< 150)
            if len(particles) <= 120:
                cv2.putText(
                    annotated_img,
                    str(p["id"]),
                    (int(p["cx"]) + 4, int(p["cy"]) - 3),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.35,
                    (255, 255, 255),
                    1,
                    cv2.LINE_AA
                )

        # Draw calibrated scale bar watermark on bottom right corner of image
        bar_len_px = int(scale_pixels)
        if bar_len_px > 10 and bar_len_px < orig_w:
            bar_y = orig_h - 22
            bar_x = orig_w - bar_len_px - 25
            # Background backdrop
            cv2.rectangle(
                annotated_img,
                (bar_x - 10, bar_y - 20),
                (bar_x + bar_len_px + 10, bar_y + 12),
                (20, 20, 20),
                -1
            )
            # White scale line
            cv2.line(annotated_img, (bar_x, bar_y), (bar_x + bar_len_px, bar_y), (255, 255, 255), 4)
            # Scale text
            label_text = f"{scale_distance} {scale_unit}"
            cv2.putText(
                annotated_img,
                label_text,
                (bar_x + int(bar_len_px / 2) - 25, bar_y - 6),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.4,
                (255, 255, 255),
                1,
                cv2.LINE_AA
            )

        # 7. Statistical Calculations & Distribution Fitting
        stats_summary = {}
        distribution_data = {}

        n_particles = len(diameters_physical)
        if n_particles > 0:
            arr_d = np.array(diameters_physical)
            mean_d = float(np.mean(arr_d))
            std_d = float(np.std(arr_d, ddof=1)) if n_particles > 1 else 0.0
            median_d = float(np.median(arr_d))
            min_d = float(np.min(arr_d))
            max_d = float(np.max(arr_d))

            # Polydispersity Index: PDI = (std / mean)^2
            pdi = float((std_d / mean_d) ** 2) if mean_d > 0 else 0.0

            # Percentiles D10, D50, D90 & Span
            d10 = float(np.percentile(arr_d, 10))
            d50 = float(np.percentile(arr_d, 50))
            d90 = float(np.percentile(arr_d, 90))
            span = float((d90 - d10) / d50) if d50 > 0 else 0.0

            # Particle density: total count / physical area in µm^2
            total_img_area_phys = (orig_w * unit_per_pixel) * (orig_h * unit_per_pixel)
            total_particle_area_phys = float(np.sum(areas_physical))
            coverage_pct = float((total_particle_area_phys / total_img_area_phys) * 100.0) if total_img_area_phys > 0 else 0.0

            # Histogram binning
            num_bins = min(30, max(8, int(math.sqrt(n_particles) * 2)))
            counts, bin_edges = np.histogram(arr_d, bins=num_bins)
            bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2.0
            bin_width = float(bin_edges[1] - bin_edges[0])

            # Mode from histogram
            mode_idx = int(np.argmax(counts))
            mode_d = float(bin_centers[mode_idx])

            # Curve Fitting: Gaussian
            gauss_curve = []
            gauss_params = {}
            try:
                p0_gauss = [float(np.max(counts)), mean_d, max(1.0, std_d)]
                popt_g, _ = curve_fit(gaussian, bin_centers, counts, p0=p0_gauss, maxfev=1500)
                fine_x = np.linspace(min_d * 0.8, max_d * 1.2, 80)
                fine_y = gaussian(fine_x, *popt_g)
                gauss_curve = [{"x": round(float(x), 2), "y": round(float(max(0, y)), 2)} for x, y in zip(fine_x, fine_y)]
                gauss_params = {
                    "amplitude": round(float(popt_g[0]), 2),
                    "mean": round(float(popt_g[1]), 2),
                    "std": round(float(abs(popt_g[2])), 2)
                }
            except Exception:
                gauss_curve = []

            # Curve Fitting: Log-Normal
            lognorm_curve = []
            lognorm_params = {}
            try:
                # Log-normal estimate
                p0_ln = [float(np.max(counts) * mean_d * 0.5), float(np.log(max(1.0, mean_d))), 0.3]
                popt_ln, _ = curve_fit(lognormal, bin_centers, counts, p0=p0_ln, maxfev=1500, bounds=(0, [np.inf, np.inf, 2.0]))
                fine_x = np.linspace(max(0.1, min_d * 0.8), max_d * 1.2, 80)
                fine_y = lognormal(fine_x, *popt_ln)
                lognorm_curve = [{"x": round(float(x), 2), "y": round(float(max(0, y)), 2)} for x, y in zip(fine_x, fine_y)]
                lognorm_params = {
                    "geometric_mean": round(float(np.exp(popt_ln[1])), 2),
                    "geometric_std": round(float(np.exp(popt_ln[2])), 2)
                }
            except Exception:
                lognorm_curve = []

            # Cumulative Distribution Q0(x) (Number-based)
            sorted_d = np.sort(arr_d)
            cum_prob = np.arange(1, n_particles + 1) / n_particles * 100.0
            # Sample 40 points for smooth charting
            indices = np.linspace(0, n_particles - 1, min(40, n_particles), dtype=int)
            cumulative_curve = [
                {"x": round(float(sorted_d[i]), 2), "cumulative_pct": round(float(cum_prob[i]), 1)}
                for i in indices
            ]

            histogram_bars = [
                {
                    "bin_center": round(float(bin_centers[i]), 2),
                    "bin_start": round(float(bin_edges[i]), 2),
                    "bin_end": round(float(bin_edges[i+1]), 2),
                    "count": int(counts[i]),
                    "frequency_pct": round(float(counts[i] / n_particles * 100.0), 2)
                }
                for i in range(len(counts))
            ]

            stats_summary = {
                "total_particles": n_particles,
                "mean_diameter": round(mean_d, 2),
                "std_deviation": round(std_d, 2),
                "median_diameter": round(median_d, 2),
                "mode_diameter": round(mode_d, 2),
                "min_diameter": round(min_d, 2),
                "max_diameter": round(max_d, 2),
                "pdi": round(pdi, 4),
                "pdi_classification": "Monodisperse" if pdi < 0.05 else ("Moderately Polydisperse" if pdi <= 0.25 else "Broadly Polydisperse"),
                "d10": round(d10, 2),
                "d50": round(d50, 2),
                "d90": round(d90, 2),
                "span": round(span, 3),
                "mean_circularity": round(float(np.mean(circularities)), 3),
                "mean_aspect_ratio": round(float(np.mean(aspect_ratios)), 2),
                "total_area_coverage_pct": round(coverage_pct, 2),
                "unit": scale_unit,
                "pixels_per_unit": round(pixels_per_unit, 4),
                "unit_per_pixel": round(unit_per_pixel, 4),
                "image_width_px": orig_w,
                "image_height_px": orig_h
            }

            distribution_data = {
                "histogram": histogram_bars,
                "gaussian_fit": gauss_curve,
                "gaussian_params": gauss_params,
                "lognormal_fit": lognorm_curve,
                "lognormal_params": lognorm_params,
                "cumulative": cumulative_curve
            }
        else:
            stats_summary = {
                "total_particles": 0,
                "mean_diameter": 0,
                "std_deviation": 0,
                "median_diameter": 0,
                "mode_diameter": 0,
                "min_diameter": 0,
                "max_diameter": 0,
                "pdi": 0,
                "pdi_classification": "N/A",
                "d10": 0,
                "d50": 0,
                "d90": 0,
                "span": 0,
                "mean_circularity": 0,
                "mean_aspect_ratio": 0,
                "total_area_coverage_pct": 0,
                "unit": scale_unit,
                "pixels_per_unit": round(pixels_per_unit, 4),
                "unit_per_pixel": round(unit_per_pixel, 4),
                "image_width_px": orig_w,
                "image_height_px": orig_h
            }
            distribution_data = {
                "histogram": [],
                "gaussian_fit": [],
                "gaussian_params": {},
                "lognormal_fit": [],
                "lognormal_params": {},
                "cumulative": []
            }

        # Encode images for frontend visualization
        annotated_b64 = self.encode_image_base64(annotated_img)
        # Create mask preview
        mask_preview = cv2.cvtColor(clean_thresh, cv2.COLOR_GRAY2BGR)
        mask_b64 = self.encode_image_base64(mask_preview)

        return {
            "success": True,
            "summary": stats_summary,
            "distribution": distribution_data,
            "particles": particles,
            "annotated_image": annotated_b64,
            "mask_image": mask_b64,
            "count": len(particles)
        }
