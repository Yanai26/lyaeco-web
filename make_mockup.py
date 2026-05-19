"""
Mockup generator: superpose Figma designs onto flat lay photos.
Uses OpenCV for perspective transform + Pillow for compositing.
"""

import cv2
import numpy as np
from PIL import Image, ImageDraw
import os

PY = "C:\\Users\\Yanai\\AppData\\Local\\Programs\\Python\\Python312\\python.exe"

BASE = r"C:\Users\Yanai\Projets\lyaeco-web"
DESIGNS = os.path.join(BASE, "images", "designs-mockups")
OUTPUT = os.path.join(BASE, "images", "mockups-finaux")
os.makedirs(OUTPUT, exist_ok=True)


def warp_design_onto_canvas(design_path, dst_corners, canvas_size):
    """
    Warp a design image (RGBA) to fit dst_corners on a transparent canvas.
    dst_corners: [(x,y) TL, TR, BR, BL] in canvas coordinates.
    Returns a PIL RGBA image of canvas_size.
    """
    design = Image.open(design_path).convert("RGBA")
    w, h = design.size

    design_np = np.array(design)

    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    dst = np.float32(dst_corners)

    M = cv2.getPerspectiveTransform(src, dst)
    warped = cv2.warpPerspective(
        design_np, M, canvas_size,
        flags=cv2.INTER_LANCZOS4,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0, 0),
    )
    return Image.fromarray(warped, "RGBA")


def composite(flat_path, mobile_corners, desktop_corners, mobile_path, desktop_path,
              out_name, debug=False):
    flat = Image.open(flat_path).convert("RGBA")
    W, H = flat.size

    mobile_layer = warp_design_onto_canvas(mobile_path, mobile_corners, (W, H))
    desktop_layer = warp_design_onto_canvas(desktop_path, desktop_corners, (W, H))

    result = flat.copy()
    result.alpha_composite(desktop_layer)
    result.alpha_composite(mobile_layer)

    out_path = os.path.join(OUTPUT, out_name)
    result.convert("RGB").save(out_path, "JPEG", quality=95)
    print(f"  Saved: {out_path}")

    if debug:
        dbg = flat.convert("RGB").copy()
        draw = ImageDraw.Draw(dbg)
        for corners, color, label in [
            (mobile_corners, (255, 0, 0), "MOBILE"),
            (desktop_corners, (0, 200, 0), "DESKTOP"),
        ]:
            pts = corners + [corners[0]]
            for i in range(len(pts) - 1):
                draw.line([pts[i], pts[i + 1]], fill=color, width=3)
            cx = int(sum(p[0] for p in corners) / 4)
            cy = int(sum(p[1] for p in corners) / 4)
            draw.text((cx - 30, cy - 10), label, fill=color)
        dbg_path = os.path.join(OUTPUT, "debug-" + out_name)
        dbg.save(dbg_path, "JPEG", quality=90)
        print(f"  Debug: {dbg_path}")

    return out_path


# ──────────────────────────────────────────────
# BOULANGER  (1024×1024 flat lay)
# Corners: TL, TR, BR, BL  (clockwise from top-left)
# ──────────────────────────────────────────────
BOULANGER_PHONE = [
    (284, 318),   # TL
    (414, 303),   # TR
    (426, 548),   # BR
    (296, 563),   # BL
]
BOULANGER_LAPTOP = [
    (483, 71),    # TL
    (838, 76),    # TR
    (840, 255),   # BR
    (472, 249),   # BL
]

if __name__ == "__main__":
    print("=== BOULANGER (test) ===")
    composite(
        flat_path=os.path.join(BASE, "images", "mockup-boulanger.jpg.jpeg"),
        mobile_corners=BOULANGER_PHONE,
        desktop_corners=BOULANGER_LAPTOP,
        mobile_path=os.path.join(DESIGNS, "design-boulanger-mobile.png"),
        desktop_path=os.path.join(DESIGNS, "design-boulanger-desktop.png"),
        out_name="final-boulanger.jpg",
        debug=True,
    )
    print("Done. Check images/mockups-finaux/")
