"""
NanoVision PDF Report Generator
Generates publication-quality characterization reports with annotated micrographs,
distribution curves, and statistical summaries conforming to ISO 13322-1 standards.
"""

import io
import base64
from datetime import datetime
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image as RLImage,
    KeepTogether,
    HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


def generate_distribution_plot_bytes(distribution_data: dict, summary_data: dict) -> bytes:
    """Generate high-resolution Matplotlib distribution chart with histogram and curve fits."""
    hist = distribution_data.get("histogram", [])
    if not hist:
        fig, ax = plt.subplots(figsize=(6.5, 3.2), dpi=200)
        ax.text(0.5, 0.5, "Insufficient particle count for curve fitting", ha="center", va="center")
        buf = io.BytesIO()
        plt.tight_layout()
        plt.savefig(buf, format="png")
        plt.close(fig)
        buf.seek(0)
        return buf.getvalue()

    centers = [b["bin_center"] for b in hist]
    counts = [b["count"] for b in hist]
    unit = summary_data.get("unit", "nm")

    fig, ax1 = plt.subplots(figsize=(7.2, 3.3), dpi=200)
    fig.patch.set_facecolor("#ffffff")
    ax1.set_facecolor("#f9fafb")

    # Histogram bars
    bars = ax1.bar(
        centers,
        counts,
        width=(centers[1] - centers[0]) * 0.9 if len(centers) > 1 else 2.0,
        color="#2563eb",
        alpha=0.65,
        edgecolor="#1d4ed8",
        label=f"Measured Counts (N={summary_data.get('total_particles', 0)})"
    )

    ax1.set_xlabel(f"Equivalent Spherical Diameter ({unit})", fontsize=10, fontweight="bold", color="#1e293b")
    ax1.set_ylabel("Particle Count", fontsize=10, fontweight="bold", color="#1e293b")
    ax1.tick_params(colors="#334155")
    ax1.grid(True, linestyle="--", alpha=0.4, color="#cbd5e1")

    # Gaussian fit line
    gauss = distribution_data.get("gaussian_fit", [])
    if gauss:
        gx = [pt["x"] for pt in gauss]
        gy = [pt["y"] for pt in gauss]
        ax1.plot(gx, gy, color="#dc2626", linewidth=2.0, label="Gaussian Fit (Normal)")

    # Cumulative curve on secondary y-axis
    cumulative = distribution_data.get("cumulative", [])
    if cumulative:
        ax2 = ax1.twinx()
        cx = [pt["x"] for pt in cumulative]
        cy = [pt["cumulative_pct"] for pt in cumulative]
        ax2.plot(cx, cy, color="#059669", linewidth=2.0, linestyle="-.", label="Cumulative Q0 (%)")
        ax2.set_ylabel("Cumulative Distribution (%)", fontsize=10, fontweight="bold", color="#059669")
        ax2.set_ylim(0, 105)
        ax2.tick_params(colors="#059669")

    # Combine legends
    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels() if cumulative else ([], [])
    ax1.legend(lines1 + lines2, labels1 + labels2, loc="upper right", fontsize=8, framealpha=0.85)

    plt.title(
        f"Particle Size Distribution & Curve Fitting (Mean: {summary_data.get('mean_diameter', 0)} ± {summary_data.get('std_deviation', 0)} {unit})",
        fontsize=11,
        fontweight="bold",
        pad=10,
        color="#0f172a"
    )

    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=200)
    plt.close(fig)
    buf.seek(0)
    return buf.getvalue()


def build_pdf_report(
    analysis_result: dict,
    sample_name: str = "Nanoparticle Sample",
    operator_name: str = "NanoVision Lab Operator",
    instrument_name: str = "SEM / TEM High-Resolution",
    notes: str = "Automated computer-vision characterization."
) -> bytes:
    """Generate complete PDF laboratory characterization certificate."""
    pdf_buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=4,
        fontName="Helvetica-Bold"
    )

    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#475569"),
        spaceAfter=12
    )

    section_header = ParagraphStyle(
        "SectionH",
        parent=styles["Heading2"],
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1e40af"),
        spaceBefore=10,
        spaceAfter=6,
        fontName="Helvetica-Bold"
    )

    body_style = ParagraphStyle(
        "BodyText",
        parent=styles["Normal"],
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1e293b")
    )

    elements = []

    # Title header banner
    elements.append(Paragraph("NanoVision™ Particle Characterization Report", title_style))
    elements.append(Paragraph(
        f"ISO 13322-1 Compliant Automated Image-Based Particle Size Analysis | Generated: {datetime.now().strftime('%B %d, %Y - %H:%M:%S')}",
        subtitle_style
    ))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2563eb"), spaceAfter=10))

    summary = analysis_result.get("summary", {})
    unit = summary.get("unit", "nm")

    # Metadata & Sample Table
    meta_data = [
        [
            Paragraph("<b>Sample Name:</b>", body_style), Paragraph(str(sample_name), body_style),
            Paragraph("<b>Analysis Date:</b>", body_style), Paragraph(datetime.now().strftime("%Y-%m-%d"), body_style)
        ],
        [
            Paragraph("<b>Instrument:</b>", body_style), Paragraph(str(instrument_name), body_style),
            Paragraph("<b>Operator:</b>", body_style), Paragraph(str(operator_name), body_style)
        ],
        [
            Paragraph("<b>Total Detected:</b>", body_style), Paragraph(f"<b>{summary.get('total_particles', 0)} particles</b>", body_style),
            Paragraph("<b>Scale Factor:</b>", body_style), Paragraph(f"{summary.get('unit_per_pixel', 0)} {unit}/pixel", body_style)
        ],
        [
            Paragraph("<b>Area Coverage:</b>", body_style), Paragraph(f"{summary.get('total_area_coverage_pct', 0)} %", body_style),
            Paragraph("<b>PDI Status:</b>", body_style), Paragraph(f"{summary.get('pdi_classification', 'N/A')} (PDI={summary.get('pdi', 0)})", body_style)
        ]
    ]

    meta_table = Table(meta_data, colWidths=[1.1 * inch, 2.5 * inch, 1.1 * inch, 2.3 * inch])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 10))

    # Core Statistical Parameters Table
    elements.append(Paragraph("Statistical Dimension Summary", section_header))

    stats_rows = [
        [
            "Parameter", "Value", "Parameter", "Value"
        ],
        [
            f"Mean Diameter ({unit})", f"{summary.get('mean_diameter', 0)} ± {summary.get('std_deviation', 0)}",
            f"Median D50 ({unit})", f"{summary.get('median_diameter', 0)}"
        ],
        [
            f"Mode Diameter ({unit})", f"{summary.get('mode_diameter', 0)}",
            "Polydispersity Index (PDI)", f"{summary.get('pdi', 0)}"
        ],
        [
            f"D10 Percentile ({unit})", f"{summary.get('d10', 0)}",
            f"D90 Percentile ({unit})", f"{summary.get('d90', 0)}"
        ],
        [
            "Span (D90-D10)/D50", f"{summary.get('span', 0)}",
            "Mean Circularity (0-1)", f"{summary.get('mean_circularity', 0)}"
        ],
        [
            "Mean Aspect Ratio", f"{summary.get('mean_aspect_ratio', 0)}",
            f"Min / Max ({unit})", f"{summary.get('min_diameter', 0)} / {summary.get('max_diameter', 0)}"
        ]
    ]

    stats_table = Table(stats_rows, colWidths=[2.1 * inch, 1.5 * inch, 2.1 * inch, 1.5 * inch])
    stats_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#93c5fd")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#ffffff"), colors.HexColor("#f8fafc")]),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
    ]))
    elements.append(stats_table)
    elements.append(Spacer(1, 10))

    # Visual Micrograph + Distribution Plot Row
    elements.append(Paragraph("Micrograph Segmentation & Distribution Curve", section_header))

    annotated_b64 = analysis_result.get("annotated_image", "")
    if annotated_b64 and "," in annotated_b64:
        img_bytes = base64.b64decode(annotated_b64.split(",")[1])
        micro_img = RLImage(io.BytesIO(img_bytes), width=3.4 * inch, height=2.4 * inch)
    else:
        micro_img = Paragraph("Micrograph preview not available", body_style)

    plot_bytes = generate_distribution_plot_bytes(analysis_result.get("distribution", {}), summary)
    plot_img = RLImage(io.BytesIO(plot_bytes), width=3.6 * inch, height=2.4 * inch)

    side_by_side = Table([[micro_img, plot_img]], colWidths=[3.5 * inch, 3.7 * inch])
    side_by_side.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(side_by_side)
    elements.append(Spacer(1, 10))

    # Methodological & Standard Statement
    cert_text = (
        "<b>Standard Compliance Notice:</b> Analysis conducted via NanoVision Computer-Vision Engine using adaptive "
        "morphological thresholding, Euclidean distance transform, and marker-controlled watershed declustering. "
        "Measurements conform to ISO 13322-1 (Particle size analysis — Dynamic and static image analysis methods) "
        "and ASTM E2859 guidelines. Results are certified for research and preliminary quality evaluation."
    )
    cert_para = Paragraph(cert_text, ParagraphStyle("Cert", parent=body_style, fontSize=7.5, leading=10, textColor=colors.HexColor("#64748b")))
    elements.append(cert_para)

    doc.build(elements)
    pdf_buffer.seek(0)
    return pdf_buffer.getvalue()
