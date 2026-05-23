import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { translateText } from "@/lib/translate";

const CACHE_KEY = "kt_tr_cache_v1";

type Cache = Record<string, string>;

function readCache(): Cache {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}") as Cache;
  } catch {
    return {};
  }
}

function writeCache(c: Cache) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* ignore quota */
  }
}

/**
 * Renders `text` translated into the user's current i18n language.
 * Falls back to the original text on failure. Results are cached in localStorage.
 */
export function TranslatedText({ text }: { text: string }) {
  const { i18n } = useTranslation();
  const lang = (i18n.language ?? "ar").split("-")[0];
  const [out, setOut] = useState(text);

  useEffect(() => {
    if (!text.trim()) {
      setOut(text);
      return;
    }
    const key = `${lang}::${text}`;
    const cache = readCache();
    if (cache[key]) {
      setOut(cache[key]);
      return;
    }
    setOut(text); // show original while fetching
    let cancelled = false;
    translateText(text, lang)
      .then((res) => {
        if (cancelled) return;
        const c = readCache();
        c[key] = res;
        writeCache(c);
        setOut(res);
      })
      .catch(() => {
        /* keep original */
      });
    return () => {
      cancelled = true;
    };
  }, [text, lang]);

  return <>{out}</>;
}
