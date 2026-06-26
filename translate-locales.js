import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const languages = ['tr', 'es', 'pt', 'zh', 'fr', 'de', 'ja', 'ko', 'ar', 'it', 'ru', 'vi', 'id', 'hi'];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const enPath = path.resolve(__dirname, 'src/locales/en/common.json');

function flattenObject(obj, prefix = '', res = {}) {
  for (const key in obj) {
    const propName = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      flattenObject(obj[key], propName, res);
    } else {
      res[propName] = obj[key];
    }
  }
  return res;
}

function unflattenObject(data) {
  const result = {};
  for (const i in data) {
    const keys = i.split('.');
    keys.reduce((r, e, j) => {
      return r[e] || (r[e] = keys[j + 1] ? (Number.isInteger(+keys[j + 1]) ? [] : {}) : data[i]);
    }, result);
  }
  return result;
}

async function fetchTranslation(text, targetLang) {
  try {
    if (targetLang === 'zh') targetLang = 'zh-CN';
    
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText;
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function start() {
  console.log('🔄 Smart scanning for *ONLY* newly added keys...');
  
  if (!fs.existsSync(enPath)) {
    console.error('❌ Master English file not found.');
    return;
  }
  
  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const flatEn = flattenObject(enData);

  for (const lang of languages) {
    const langFilePath = path.resolve(__dirname, `src/locales/${lang}/common.json`);
    let langData = {};

    if (fs.existsSync(langFilePath)) {
      try { langData = JSON.parse(fs.readFileSync(langFilePath, 'utf8')); } catch (e) { langData = {}; }
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