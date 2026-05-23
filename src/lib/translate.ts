// Auto translation utility.
// Primary: Google Translate's public gtx endpoint (auto source detection, CORS-friendly).
// Fallback: LibreTranslate public mirrors.

const LIBRE_ENDPOINTS = [
  "https://translate.fedilab.app/translate",
  "https://libretranslate.de/translate",
  "https://translate.argosopentech.com/translate",
];

async function viaGoogle(text: string, target: string): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
      target,
    )}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    // Response shape: [[[translated, original, ...], ...], ...]
    if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
    const parts = (data[0] as unknown[])
      .map((seg) => (Array.isArray(seg) ? String(seg[0] ?? "") : ""))
      .join("");
    return parts || null;
  } catch {
    return null;
  }
}

async function viaLibre(text: string, target: string): Promise<string | null> {
  for (const url of LIBRE_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source: "auto", target, format: "text" }),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { translatedText?: string };
      if (data.translatedText) return data.translatedText;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function translateText(text: string, target: string): Promise<string> {
  if (!text.trim()) return text;
  const g = await viaGoogle(text, target);
  if (g) return g;
  const l = await viaLibre(text, target);
  if (l) return l;
  throw new Error("Translation service unavailable");
}
