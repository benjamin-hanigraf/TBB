// A photo with a smaller phone-sized version, fixed dimensions (no layout jumps) and optional high priority for the first photo on a page.
export default function Pic({ src, alt, sizes = '(max-width: 700px) 90vw, 340px', eager = false, priority = eager, w = 800, h = 1000, className, style }) {
  const small = /\.webp$/.test(src || '') && !/-640\.webp$/.test(src) ? src.replace(/\.webp$/, '-640.webp') : null;
  return <img src={src} srcSet={small ? `${small} 640w, ${src} 1600w` : undefined} sizes={small ? sizes : undefined} alt={alt} width={w} height={h}
    loading={eager ? undefined : 'lazy'} fetchPriority={priority ? 'high' : undefined} decoding="async" className={className} style={style} />;
}
