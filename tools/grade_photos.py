"""Gives every photograph the same look: brightness, contrast, saturation and vibrance are
nudged toward one target (with limits, so intentionally dark photos stay moody).
Usage: python3 tools/grade_photos.py <folder with original photos> <output folder>"""
import numpy as np, glob, os, sys
from PIL import Image, ImageOps
Image.MAX_IMAGE_PIXELS = None
NOT_PHOTO = {'0f81005210','4480b82041','65827d2dd3','5d3531b4c4','995871d30d','bb92c0e6df','e4d0ea11bc','e5bfcf8182','fae46dc1fe','78cebc91e1','883c2a80d5','a1e6dfa730','c8814ca489','9ec99f62d1','cae04bb1fc','80436c064f','899fa3a42d'}
T_BRIGHT, T_RANGE, T_SAT = 0.66, 0.78, 0.24     # targets (median brightness, 5-95% tonal range, mean saturation)

def lum(a): return 0.2126*a[...,0] + 0.7152*a[...,1] + 0.0722*a[...,2]
def white_balance(a):
    # photos with a pale, neutral-ish surface get its colour cast pulled toward one soft warm white
    L = lum(a); hi = a[L >= np.percentile(L, 70)]
    mx, mn = hi.max(-1), hi.min(-1)
    if float(np.mean((mx-mn)/np.maximum(mx, 1e-6))) > 0.22: return a      # strongly coloured scene (e.g. gold on black): leave alone
    c = hi.mean(0); target = np.array([1.0, 0.985, 0.955]) * float(c.mean())
    gain = np.clip(target/np.maximum(c, 1e-3), 0.78, 1.25)
    gain = 1 + (gain-1)*0.9
    return np.clip(a*gain, 0, 1)
def grade(a):
    a = white_balance(a)
    # 1. brightness: gamma so the median sits near the target (limited)
    m = float(np.clip(np.median(lum(a)), 0.03, 0.97))
    g = float(np.clip(np.log(T_BRIGHT)/np.log(m), 0.78, 1.12))
    if m < 0.25: g = max(g, 0.9)          # keep deliberately dark photos moody
    a = np.power(a, g)
    # 2. contrast: widen or narrow the tonal range around the median (limited)
    L = lum(a); lo, hi, med = np.percentile(L, [5, 95, 50]); rng = max(hi-lo, 1e-3)
    f = float(np.clip(T_RANGE/rng, 0.92, 1.15))
    a = np.clip(med + (a-med)*f, 0, 1)
    # 3. saturation (strong colours pulled down) and vibrance (muted colours lifted more than vivid ones)
    mx, mn = a.max(-1), a.min(-1); s = np.where(mx > 0, (mx-mn)/np.maximum(mx, 1e-6), 0); ms = float(s.mean())
    if ms > T_SAT:  k = float(np.clip(T_SAT/ms, 0.8, 1.0)); s2 = s*k
    else:           kv = float(np.clip((T_SAT/max(ms, 0.02))-1, 0, 0.22)); s2 = s*(1 + kv*(1-s)) ; s2 = np.minimum(s2, 1)
    ratio = np.where(s > 1e-4, s2/np.maximum(s, 1e-4), 1)[..., None]
    gray = mx[..., None] - (mx-mn)[..., None]*0   # keep value (max channel); scale chroma
    a = np.clip(mx[..., None] - (mx[..., None]-a)*ratio, 0, 1)
    return a
if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]; os.makedirs(dst, exist_ok=True)
    for f in sorted(glob.glob(src+'/*')):
        name = os.path.splitext(os.path.basename(f))[0].replace('29a943_', '')[:10]
        if name in NOT_PHOTO: continue
        im = ImageOps.exif_transpose(Image.open(f)).convert('RGB'); im.thumbnail((1600, 1600))
        a = grade(np.asarray(im).astype(np.float32)/255)
        Image.fromarray((a*255+.5).astype(np.uint8)).save(f'{dst}/{name}.webp', 'WEBP', quality=84, method=6)
