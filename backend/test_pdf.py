from sample_generator import generate_micrograph_sample
from cv_engine import NanoparticleAnalyzer
from report_generator import build_pdf_report

s = generate_micrograph_sample('aunp')
analyzer = NanoparticleAnalyzer()
r = analyzer.process_micrograph(s['image'], scale_pixels=250, scale_distance=50, scale_unit='nm', invert_colors=True)
pdf_bytes = build_pdf_report(r, sample_name="AuNPs Standard Specimen")
print("PDF generated successfully, size:", len(pdf_bytes), "bytes")
