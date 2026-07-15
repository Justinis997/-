from pathlib import Path
import sys
from PIL import Image

source = Path(sys.argv[1])
target = Path(sys.argv[2])
image = Image.open(source).convert("RGBA")
image.putdata([(0, 0, 0, alpha) for _red, _green, _blue, alpha in image.get_flattened_data()])
target.parent.mkdir(parents=True, exist_ok=True)
image.save(target, format="PNG", optimize=True)
