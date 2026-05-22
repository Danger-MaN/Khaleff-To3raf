// LibreTranslate-based auto translation utility.
// Uses public endpoint; can fail/be rate-limited — caller handles errors.
const ENDPOINTS = [
  "https://translate.fedilab.app/translate",
  "https://libretranslate.de/translate",
  "https://translate.argosopentech.com/translate",
];

export async function translateText(text: string, target: string, source = "auto"): Promise<string> {
  if (!text.trim()) return text;
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source, target, format: "text" }),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { translatedText?: string };
      if (data.translatedText) return data.translatedText;
    } catch {
      // try next
    }
  }
  throw new Error("Translation service unavailable");
}
