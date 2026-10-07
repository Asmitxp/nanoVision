from sample_generator import generate_micrograph_sample
from cv_engine import NanoparticleAnalyzer
import time

print("Starting test...")
t0 = time.time()
s = generate_micrograph_sample('aunp')
print("Sample generated in", round(time.time() - t0, 3), "s")

analyzer = NanoparticleAnalyzer()
t1 = time.time()
r = analyzer.process_micrograph(s['image'], scale_pixels=250, scale_distance=50, scale_unit='nm', invert_colors=True)
print("Processed in", round(time.time() - t1, 3), "s")

print("Detected particles:", r['summary']['total_particles'])
print("Mean diameter:", r['summary']['mean_diameter'], r['summary']['unit'])
print("PDI:", r['summary']['pdi'], r['summary']['pdi_classification'])
print("Test completed successfully!")
