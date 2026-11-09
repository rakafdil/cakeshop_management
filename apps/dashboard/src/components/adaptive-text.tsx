import { layout, prepare, type PreparedText } from "@chenglou/pretext";
import { useEffect, useRef, useState } from "react";

const preparedCache = new Map<string, PreparedText>();

function getPrepared(text: string, font: string): PreparedText {
  const key = `${font}|${text}`;
  let p = preparedCache.get(key);
  if (!p) {
    p = prepare(text, font);
    preparedCache.set(key, p);
  }
  return p;
}

/**
 * Teks yang mengecilkan ukuran font secara bertahap (diukur dengan pretext,
 * tanpa reflow DOM) sampai muat dalam `maxLines` baris selebar kontainernya.
 */
export function AdaptiveText({
  text,
  baseSize = 16,
  minSize = 11,
  maxLines = 1,
  weight = 600,
  lineHeight = 1.35,
  className = "",
}: {
  text: string;
  baseSize?: number;
  minSize?: number;
  maxLines?: number;
  weight?: number;
  lineHeight?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState(baseSize);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const compute = () => {
      const width = el.clientWidth;
      if (!width) return;
      const family = getComputedStyle(el).fontFamily;
      let chosen = minSize;
      for (let s = baseSize; s >= minSize; s--) {
        const prepared = getPrepared(text, `${weight} ${s}px ${family}`);
        const { lineCount } = layout(prepared, width, s * lineHeight);
        if (lineCount <= maxLines) {
          chosen = s;
          break;
        }
      }
      setSize(chosen);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, baseSize, minSize, maxLines, weight, lineHeight]);

  return (
    <span ref={ref} className={`block ${className}`} style={{ fontSize: size, lineHeight, fontWeight: weight }}>
      {text}
    </span>
  );
}
