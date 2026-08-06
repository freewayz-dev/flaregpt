import fs from 'fs';
import path from 'path';

const languages = ['tr', 'es', 'pt', 'zh', 'fr', 'de', 'ja', 'ko', 'ar', 'it', 'ru', 'vi', 'id', 'hi'];

// `import.meta.dirname` (Node 20.11+/21.2+, stable) replaces the old
// `fileURLToPath(import.meta.url)` + `path.dirname()` boilerplate — this
// project's `engines.node` (">=24") already guarantees it's available.
const __dirname = import.meta.dirname;
const enPath = path.resolve(__dirname, 'src/locales/en/common.json');

// A locale tree is arbitrarily nested JSON (objects all the way down to
// string leaves) — `unknown` at the nested level, `string` once flattened,
// since every real leaf in these files is a translation string.
type NestedTree = { [key: string]: unknown };
type FlatTree = Record<string, string>;

function flattenObject(obj: NestedTree, prefix = '', res: FlatTree = {}): FlatTree {
  for (const key in obj) {
    const propName = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (typeof value === 'object' && value !== null) {
      flattenObject(value as NestedTree, propName, res);
    } else {
      res[propName] = value as string;
    }
  }
  return res;
}

function unflattenObject(data: FlatTree): NestedTree {
  const result: NestedTree = {};
  for (const i in data) {
    const keys = i.split('.');
    keys.reduce((r: NestedTree, e, j) => {
      return (r[e] as NestedTree) || (r[e] = keys[j + 1] ? (Number.isInteger(+keys[j + 1]) ? [] : {}) : data[i]);
    }, result);
  }
  return result;
}

interface MyMemoryResponse {
  responseData?: {
    translatedText?: string;
  };
}

async function fetchTranslation(text: string, targetLang: string): Promise<string | null> {
  try {
    if (targetLang === 'zh') targetLang = 'zh-CN';

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
    const response = await fetch(url);
    const data = (await response.json()) as MyMemoryResponse;

    const translated = data?.responseData?.translatedText;
    // MyMemory's free tier returns its rate-limit notice *as* translatedText
    // (HTTP 200, not an error status) once the daily quota is used up — a
    // plain truthy check let that literal warning string get written into
    // a locale file as if it were a real translation. Treating it as a
    // failure here falls through to the empty-string "retry next time"
    // path below instead.
    if (translated && !translated.includes('MYMEMORY WARNING')) {
      return translated;
    }
    return null;
  } catch {
    return null;
  }
}

async function start(): Promise<void> {
  console.log('🔄 Smart scanning for *ONLY* newly added keys...');

  if (!fs.existsSync(enPath)) {
    console.error('❌ Master English file not found.');
    return;
  }

  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8')) as NestedTree;
  const flatEn = flattenObject(enData);

  for (const lang of languages) {
    const langFilePath = path.resolve(__dirname, `src/locales/${lang}/common.json`);
    let langData: NestedTree = {};

    if (fs.existsSync(langFilePath)) {
      try {
        langData = JSON.parse(fs.readFileSync(langFilePath, 'utf8')) as NestedTree;
      } catch {
        langData = {};
      }
    }

    const flatLang = flattenObject(langData);
    let updatedAny = false;

    for (const key in flatEn) {
      const currentVal = flatLang[key];

      // ─── THE CRITICAL FIX ──────────────────────────────────────────
      // Only touch keys that are completely missing or explicit empty strings ""
      if (currentVal === undefined || currentVal === "") {

        // Skip purely technical numbers/IDs (e.g., "01", "02")
        if (/^\d+$/.test(flatEn[key].trim())) {
          flatLang[key] = flatEn[key];
          continue;
        }

        console.log(`📡 Translating new key [${lang.toUpperCase()}]: "${flatEn[key]}"`);
        const translatedText = await fetchTranslation(flatEn[key], lang);

        if (translatedText) {
          flatLang[key] = translatedText;
          updatedAny = true;
          console.log(`   └─ ✅ Success: "${translatedText}"`);
        } else {
          flatLang[key] = ""; // Keep it empty for a retry next time if network blips
        }

        // Short 1-second delay between individual translations
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (updatedAny) {
      const nestedResult = unflattenObject(flatLang);
      fs.writeFileSync(langFilePath, JSON.stringify(nestedResult, null, 2), 'utf8');
      console.log(`💾 Saved updates to [${lang.toUpperCase()}].`);
    } else {
      console.log(`✅ [${lang.toUpperCase()}] is already up to date (0 new keys found).`);
    }
  }

  console.log('🎉 Done! Continuous localization cycle finished.');
}

start();
