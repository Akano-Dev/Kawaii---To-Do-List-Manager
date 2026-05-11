"""
Generate PNG icons from icon.svg using cairosvg or Pillow+cairosvg.
Run: python icons/generate-icons.py

If cairosvg is not installed: pip install cairosvg
Fallback: the SVG itself works as an icon in modern browsers.
"""
import os, sys

SIZES = [72, 96, 128, 192, 256, 512]
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SVG_PATH   = os.path.join(SCRIPT_DIR, 'icon.svg')

try:
    import cairosvg
    for size in SIZES:
        out = os.path.join(SCRIPT_DIR, f'icon-{size}.png')
        cairosvg.svg2png(url=SVG_PATH, write_to=out, output_width=size, output_height=size)
        print(f'✅ Generated icon-{size}.png')
    print('\n🎉 All icons generated!')
except ImportError:
    print('cairosvg not found. Generating PNG placeholders via pure Python...')
    # Pure Python fallback — creates minimal valid PNGs
    import struct, zlib

    def make_png(size, bg=(255, 238, 247), fg=(255, 157, 187)):
        """Create a simple solid-color PNG as placeholder."""
        def chunk(name, data):
            c = struct.pack('>I', len(data)) + name + data
            return c + struct.pack('>I', zlib.crc32(c[4:]) & 0xffffffff)

        # IHDR
        ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
        # Image data — simple gradient pixel art feel
        raw = b''
        for y in range(size):
            raw += b'\x00'  # filter type none
            for x in range(size):
                # Pixel art border
                border = max(size // 16, 2)
                if x < border or x >= size-border or y < border or y >= size-border:
                    raw += bytes([45, 45, 45])  # ink border
                elif x < border*2 or x >= size-border*2 or y < border*2 or y >= size-border*2:
                    raw += bytes(list(fg))       # pink frame
                else:
                    raw += bytes(list(bg))       # pale background

        compressed = zlib.compress(raw, 9)
        png = (b'\x89PNG\r\n\x1a\n'
               + chunk(b'IHDR', ihdr)
               + chunk(b'IDAT', compressed)
               + chunk(b'IEND', b''))
        return png

    for size in SIZES:
        out = os.path.join(SCRIPT_DIR, f'icon-{size}.png')
        with open(out, 'wb') as f:
            f.write(make_png(size))
        print(f'✅ Generated placeholder icon-{size}.png ({size}x{size})')

    print('\n🎉 Placeholder icons generated!')
    print('💡 For pixel-art icons, install cairosvg: pip install cairosvg')
    print('   Then re-run this script.')
