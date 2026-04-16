#!/usr/bin/env node
// StudyPath — gerador de ícones minimalistas cross-platform.
//
// Marca: curva ascendente com ponto-âncora final. Coral sobre card cream
// pro app icon; preto sobre transparente (template) pro tray do macOS;
// coral sobre transparente pro tray do Windows/Linux.
//
// Saídas:
//   build/icon.png             1024×1024 — Linux + fallback electron-builder
//   build/icon@2x.png          2048×2048 — opcional pra HiDPI
//   build/icon.icns            macOS (via iconutil)
//   build/icon.ico             Windows (multi-res PIL)
//   build/tray-icon.png        22×22 macOS template (preto)
//   build/tray-icon@2x.png     44×44 macOS template
//   build/tray-icon-color.png  16×16 Win/Linux (coral)
//   build/tray-icon-color@2x.png 32×32 Win/Linux
//   public/favicon.svg         SVG hand-written pro renderer

import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const buildDir = resolve(projectRoot, 'build');
const publicDir = resolve(projectRoot, 'public');
const iconsetDir = resolve(buildDir, 'icon.iconset');

mkdirSync(buildDir, { recursive: true });
mkdirSync(publicDir, { recursive: true });

/* ─── Python embedded generator ──────────────────────────────────────── */

const pyScript = String.raw`
import os, sys
from PIL import Image, ImageDraw

BG     = (244, 240, 230, 255)   # #F4F0E6 cream
ACCENT = (232, 79, 60, 255)     # #E84F3C coral
BLACK  = (0, 0, 0, 255)

# Quadratic bezier sampled — ascending arc from lower-left to upper-right.
# Percentages of the canvas size.
P0 = (0.25, 0.78)
P1 = (0.30, 0.30)
P2 = (0.75, 0.25)

def bezier_points(size, n=160):
    pts = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        x = (u*u) * P0[0] + 2*u*t * P1[0] + (t*t) * P2[0]
        y = (u*u) * P0[1] + 2*u*t * P1[1] + (t*t) * P2[1]
        pts.append((x * size, y * size))
    return pts

def draw_mark(drawctx, size, color):
    """
    Paint the brand mark (ascending arc + terminal dot) by stamping circles
    along the bezier path. Stamping avoids the overlap-striations that PIL's
    line(joint="curve") produces at thick widths, and gives us a perfectly
    smooth stroke with naturally round endcaps.
    """
    stroke = max(2, int(round(size * 0.115)))
    dot_r  = max(2, int(round(size * 0.095)))
    r = stroke / 2.0

    # Oversample the curve — density must exceed stroke radius to avoid gaps.
    n_samples = max(200, int(size * 1.4))
    pts = bezier_points(size, n=n_samples)

    for (x, y) in pts:
        drawctx.ellipse(
            [x - r, y - r, x + r, y + r],
            fill=color,
        )

    # Terminal milestone dot (larger than stroke)
    x2, y2 = pts[-1]
    drawctx.ellipse(
        [x2 - dot_r, y2 - dot_r, x2 + dot_r, y2 + dot_r],
        fill=color,
    )

def make_card(size):
    """Full app icon — rounded cream card with coral mark."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    radius = int(round(size * 0.22))
    d.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=radius, fill=BG)
    draw_mark(d, size, ACCENT)
    return img

def make_tray_template(size):
    """macOS template tray — pure black silhouette on transparent."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_mark(d, size, BLACK)
    return img

def make_tray_color(size):
    """Win/Linux tray — coral mark on transparent."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_mark(d, size, ACCENT)
    return img

def save(path, img):
    img.save(path, "PNG")
    print("wrote", path, img.size)

def main():
    build_dir   = sys.argv[1]
    iconset_dir = sys.argv[2]
    public_dir  = sys.argv[3]

    os.makedirs(iconset_dir, exist_ok=True)

    # Primary PNGs
    save(os.path.join(build_dir, "icon.png"),    make_card(1024))
    save(os.path.join(build_dir, "icon@2x.png"), make_card(2048))

    # Tray — macOS template (black on transparent, NO card)
    save(os.path.join(build_dir, "tray-icon.png"),    make_tray_template(22))
    save(os.path.join(build_dir, "tray-icon@2x.png"), make_tray_template(44))

    # Tray — Win/Linux (coral on transparent, NO card)
    save(os.path.join(build_dir, "tray-icon-color.png"),    make_tray_color(16))
    save(os.path.join(build_dir, "tray-icon-color@2x.png"), make_tray_color(32))

    # ICO — Windows multi-res. Let Pillow resample from the 256 master.
    ico_master = make_card(256)
    ico_path = os.path.join(build_dir, "icon.ico")
    ico_master.save(
        ico_path,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    print("wrote", ico_path)

    # macOS iconset — per-size crisp renders for iconutil
    iconset_specs = [
        (16,   "icon_16x16.png"),
        (32,   "icon_16x16@2x.png"),
        (32,   "icon_32x32.png"),
        (64,   "icon_32x32@2x.png"),
        (128,  "icon_128x128.png"),
        (256,  "icon_128x128@2x.png"),
        (256,  "icon_256x256.png"),
        (512,  "icon_256x256@2x.png"),
        (512,  "icon_512x512.png"),
        (1024, "icon_512x512@2x.png"),
    ]
    for size, name in iconset_specs:
        save(os.path.join(iconset_dir, name), make_card(size))

main()
`;

console.log('[icon] running Python (PIL) generator…');
const py = spawnSync('python3', ['-c', pyScript, buildDir, iconsetDir, publicDir], {
  stdio: 'inherit',
});
if (py.status !== 0) {
  console.error('[icon] Python generation failed');
  process.exit(py.status ?? 1);
}

/* ─── ICNS via iconutil (macOS only) ─────────────────────────────────── */

if (process.platform === 'darwin') {
  const icnsPath = resolve(buildDir, 'icon.icns');
  console.log('[icon] running iconutil →', icnsPath);
  const iconutil = spawnSync(
    'iconutil',
    ['-c', 'icns', iconsetDir, '-o', icnsPath],
    { stdio: 'inherit' },
  );
  if (iconutil.status !== 0) {
    console.error('[icon] iconutil failed');
    process.exit(iconutil.status ?? 1);
  }
} else {
  console.log('[icon] skipping iconutil (not on macOS)');
}

/* ─── Cleanup intermediate iconset ───────────────────────────────────── */

if (existsSync(iconsetDir)) {
  rmSync(iconsetDir, { recursive: true, force: true });
}

/* ─── SVG favicon for the renderer ───────────────────────────────────── */

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <title>StudyPath</title>
  <!-- ascending arc -->
  <path
    d="M 25 78 Q 30 30, 75 25"
    stroke="#E84F3C"
    stroke-width="11"
    stroke-linecap="round"
    stroke-linejoin="round"
    fill="none"
  />
  <!-- milestone dot -->
  <circle cx="75" cy="25" r="9" fill="#E84F3C" />
</svg>
`;
const faviconPath = resolve(publicDir, 'favicon.svg');
writeFileSync(faviconPath, faviconSvg, 'utf-8');
console.log('wrote', faviconPath);

console.log('[icon] done ✅');
