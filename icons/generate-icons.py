"""
Generate PNG icons using Pillow (pip install pillow).
Renders the Sylveon pixel art + PixiDo text directly.
"""
import os, struct, zlib

SIZES = [72, 96, 128, 192, 256, 512]
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# ---- Try Pillow first ----
try:
    from PIL import Image, ImageDraw, ImageFont

    def make_icon_pillow(size):
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        s = size / 512  # scale factor

        def px(x, y, w, h, color):
            x0, y0 = int(x*s), int(y*s)
            x1, y1 = max(x0+1, int((x+w)*s)), max(y0+1, int((y+h)*s))
            d.rectangle([x0, y0, x1-1, y1-1], fill=color)

        # Background
        for i in range(size):
            t = i / size
            r = int(255 * (1 - t * 0.05))
            g = int(238 * (1 - t * 0.08))
            b = int(247 * (1 - t * 0.03))
            d.rectangle([0, i, size-1, i], fill=(r, g, b, 255))

        # Border
        px(0,   0,   512, 32,  (45,45,45,255))
        px(0,   480, 512, 32,  (45,45,45,255))
        px(0,   0,   32,  512, (45,45,45,255))
        px(480, 0,   32,  512, (45,45,45,255))
        px(32,  32,  448, 16,  (255,157,187,255))
        px(32,  464, 448, 16,  (255,157,187,255))
        px(32,  32,  16,  448, (255,157,187,255))
        px(464, 32,  16,  448, (255,157,187,255))

        # Colors
        PINK   = (244,160,184,255)
        DPINK  = (192, 96,122,255)
        BLUE   = ( 91,200,232,255)
        DBLUE  = ( 26, 96,128,255)
        WHITE  = (255,255,255,255)
        INK    = ( 45, 45, 45,255)
        YELLOW = (255,217, 61,255)
        MINT   = (168,230,207,255)
        LPINK  = (255,157,187,255)

        # Body
        px(208,192, 96, 80, PINK)
        px(192,208,128, 64, PINK)
        px(176,224,160, 48, PINK)
        # Head
        px(224,144, 80, 64, PINK)
        px(208,160, 96, 48, PINK)
        # Ears
        px(224,112, 32, 48, PINK)
        px(272,112, 32, 48, PINK)
        px(224, 96, 32, 16, DPINK)
        px(272, 96, 32, 16, DPINK)
        # Eyes
        px(232,176, 20, 20, BLUE)
        px(276,176, 20, 20, BLUE)
        px(236,180, 12, 12, DBLUE)
        px(280,180, 12, 12, DBLUE)
        px(236,180,  6,  6, WHITE)
        px(280,180,  6,  6, WHITE)
        # Nose & mouth
        px(252,200,  8,  6, DPINK)
        px(244,208,  8,  4, DPINK)
        px(276,208,  8,  4, DPINK)
        px(252,212, 24,  4, DPINK)
        # Head bow
        px(256,128, 32, 16, BLUE)
        px(248,132, 48,  8, BLUE)
        px(268,130,  8, 12, WHITE)
        # Feelers
        px(128,192, 80, 16, PINK)
        px(112,208, 32, 16, PINK)
        px( 96,224, 32, 16, BLUE)
        px( 80,224, 16, 16, BLUE)
        px(304,192, 80, 16, PINK)
        px(368,208, 32, 16, PINK)
        px(384,224, 32, 16, BLUE)
        px(416,224, 16, 16, BLUE)
        # Legs
        px(208,272, 32, 48, PINK)
        px(256,272, 32, 48, PINK)
        px(304,272, 32, 48, PINK)
        px(208,304, 32, 16, WHITE)
        px(256,304, 32, 16, WHITE)
        px(304,304, 32, 16, WHITE)
        # Tail
        px(320,240, 48, 16, PINK)
        px(352,256, 32, 16, PINK)
        px(368,272, 16, 16, BLUE)
        # Chest bow
        px(232,240, 48, 16, BLUE)
        px(248,232, 16,  8, BLUE)
        px(264,232, 16,  8, BLUE)
        px(252,234,  8, 12, WHITE)
        # Sparkles
        px( 96,144, 16, 16, YELLOW)
        px( 88,152, 32,  8, YELLOW)
        px(400,160, 16, 16, YELLOW)
        px(392,168, 32,  8, YELLOW)
        px(144,304, 12, 12, MINT)
        px(138,310, 24,  6, MINT)

        # "PixiDo" text — pixel font
        # P
        px( 96,368, 12, 48, INK)
        px(108,368, 24, 12, INK)
        px(132,380, 12, 12, INK)
        px(108,392, 24, 12, INK)
        # i dot
        px(156,368, 12, 12, LPINK)
        px(156,388, 12, 28, INK)
        # x
        px(180,388, 12, 12, INK)
        px(204,388, 12, 12, INK)
        px(192,400, 12, 12, INK)
        px(180,412, 12, 12, INK)
        px(204,412, 12, 12, INK)
        # i dot
        px(228,368, 12, 12, LPINK)
        px(228,388, 12, 28, INK)
        # D
        px(252,368, 12, 48, INK)
        px(264,368, 24, 12, INK)
        px(288,380, 12, 24, INK)
        px(264,404, 24, 12, INK)
        # o
        px(312,388, 12, 28, INK)
        px(348,388, 12, 28, INK)
        px(324,388, 24, 12, INK)
        px(324,404, 24, 12, INK)
        # Underline
        px( 96,424,280,  6, LPINK)
        px( 96,430,280,  4, BLUE)

        return img

    for size in SIZES:
        out = os.path.join(SCRIPT_DIR, f'icon-{size}.png')
        img = make_icon_pillow(size)
        img.save(out, 'PNG')
        print(f'✅ Generated icon-{size}.png')
    print('\n🎉 All icons generated with Pillow!')

except ImportError:
    print('Pillow not found. Installing...')
    os.system('pip install pillow')
    print('Run this script again after install.')
