export type CategoryKey = "philosophy" | "science" | "sexuality" | "general";

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  // Built-in CategoryKey or a custom category key created from the admin panel.
  category: string;
  mediaUrl?: string;
  createdAt: number;
  translations?: Partial<Record<string, { title: string; excerpt: string; content: string }>>;
}

const KEY = "kt_articles_v1";

const SEED: Article[] = [
  {
    id: "seed-1",
    slug: "fi-madh-al-shakk",
    title: "في مدح الشك: لماذا اليقين هو أوّل الموت",
    excerpt: "اليقين راحةٌ كاذبة يمنحها العقلُ لنفسه ليتوقّف عن العمل. أمّا الشكّ، فهو الحياة ذاتها تتنفّس داخل الفكر.",
    content: `حين قال ديكارت "أنا أشكّ إذًا أنا موجود"، لم يكن يفتح بابًا للفلسفة، بل كان يُغلق باب اليقين إلى الأبد. لأنّ كلّ يقينٍ هو، في جوهره، اعترافٌ مُبكّر بالعجز عن المواصلة.

نحن نخاف الشكّ لأنّنا نخاف الفراغ الذي يخلّفه. لكنّ هذا الفراغ هو بالتحديد ما يجعل المعرفة ممكنة. العقل الذي لا يشكّ هو عقلٌ ميّت، حتى لو ظنّ أنّه يفكّر.

في الثقافة العربية، نُربّى على تقديس اليقين كأنّه فضيلة. لكنّ التاريخ الفكري كلّه يُخبرنا أنّ كلّ ثورةٍ معرفية بدأت بسؤالٍ صغير: "وماذا لو كان الأمر عكس ذلك؟"

هذا السؤال البسيط هو ما يفصل الكاهن عن الفيلسوف، والمستهلك عن المُفكّر. والمنصّة التي تقرأها الآن قائمةٌ على فرضيةٍ واحدة: أن يكون الشكّ هو الفعل الأكثر شجاعةً في زمنٍ يبيع فيه الجميع اليقين بالجملة.`,
    category: "philosophy",
    mediaUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1600",
    createdAt: 1730000000000,
  },
  {
    id: "seed-2",
    slug: "al-jasad-laysa-aaran",
    title: "الجسد ليس عارًا: قراءة في تواطؤ الثقافة ضد الرغبة",
    excerpt: "الرغبة ليست خطيئة، بل لغة. والثقافة التي تُسكتها تُنتج كائناتٍ نصفية: نصفها يتكلّم، ونصفها يكذب.",
    content: `لقرونٍ طويلة، تواطأت المؤسّسات الدينية والاجتماعية على تحويل الجسد من حقيقةٍ بيولوجية إلى ساحة معركة أخلاقية. ولم يكن الهدف يومًا حماية الإنسان، بل التحكّم به.

الثقافة الجنسية ليست ترفًا فكريًا، بل ضرورة معرفية. حين تجهل جسدك، يصبح من السهل أن تجهل حقوقك. وحين تخجل من رغبتك، يصبح من السهل أن تخجل من رأيك.

علم النفس الحديث، من فرويد إلى رايخ إلى فوكو، أثبت أنّ الكبت الجنسي ليس مسألة فردية، بل بنية سلطوية كاملة. المجتمعات التي تُحارب المعرفة الجنسية هي ذاتها التي تُحارب حرية التعبير، وليس صدفة.

في هذه المنصّة، نتعامل مع الثقافة الجنسية كما نتعامل مع الفلسفة: بالعقل لا بالعاطفة، وبالبحث لا بالأحكام المسبقة. لأنّ الإنسان الذي يفهم جسده، يفهم نفسه. والذي يفهم نفسه، يصعب أن يُساس.`,
    category: "sexuality",
    mediaUrl: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=1600",
    createdAt: 1730086400000,
  },
  {
    id: "seed-3",
    slug: "al-tajriba-laysat-al-haqiqa",
    title: "التجربة ليست الحقيقة: حدود المنهج العلمي",
    excerpt: "العلم لا يكتشف الحقيقة، بل يبني نماذج تعمل حتى تتعطّل. وهذا أعظم إنجازاته، لا أكبر عيوبه.",
    content: `يُخطئ الكثيرون حين يظنّون أنّ العلم يقدّم لنا "الحقيقة". في واقع الأمر، العلم يقدّم لنا أفضل النماذج التفسيرية المتاحة، والتي ستُستبدل حتمًا بنماذج أفضل.

نيوتن لم "يكتشف" الجاذبية، بل اقترح نموذجًا ينجح في التنبّؤ بسلوك الأجسام. أتى آينشتاين بنموذجٍ أعمق. وميكانيكا الكمّ كسرت كلا النموذجين في عوالم محدّدة.

هذا ليس عيبًا في العلم، بل قوّته. لأنّه المعرفة الوحيدة التي تعترف بحدودها وتحتفل بأخطائها. كلّ "خطأ" في العلم هو خطوة نحو نموذج أدقّ.

المشكلة تبدأ حين نتعامل مع النظريات العلمية كعقائد دينية، أو حين نرفضها لأنّها لا تتماشى مع قناعاتنا. كلا الموقفين خيانة لروح العلم نفسه. العلم منهجٌ في التفكير، لا قائمة من الحقائق المُسلّم بها.`,
    category: "science",
    mediaUrl: "https://www.youtube.com/watch?v=ZAhjZuwQuyA",
    createdAt: 1730172800000,
  },
];

function read(): Article[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as Article[];
  } catch {
    return SEED;
  }
}

function write(list: Article[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("kt_articles_changed"));
}

export const articlesStore = {
  list(): Article[] {
    return read().sort((a, b) => b.createdAt - a.createdAt);
  },
  get(slug: string): Article | undefined {
    return read().find((a) => a.slug === slug);
  },
  getById(id: string | number): Article | undefined {
    const n = typeof id === "string" ? Number(id) : id;
    return read().find((a) => a.createdAt === n);
  },
  upsert(a: Article) {
    const list = read();
    const i = list.findIndex((x) => x.id === a.id);
    if (i >= 0) list[i] = a;
    else list.unshift(a);
    write(list);
  },

  remove(id: string) {
    write(read().filter((a) => a.id !== id));
  },
  reset() {
    localStorage.removeItem(KEY);
    write(SEED);
  },
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s\u0600-\u06FF]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || `article-${Date.now()}`;
}

export function readingTime(text: string): number {
  return Math.max(1, Math.round(text.split(/\s+/).length / 220));
}
