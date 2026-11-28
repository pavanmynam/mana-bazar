// Smart search for the home screen: one box finds items, shops and departments
// across every open shop, in English, Telugu script or Tenglish, with short
// forms and small spelling mistakes. Results are ranked by match, then by
// nearest open shop. Runs fully in the browser on the loaded catalogue.

// Telugu / Tenglish / Hindi / short words → English words used in product names.
// Keys are matched as whole words (or phrases); values are what we search for.
const ALIASES = {
  // staples
  'బియ్యం': 'rice', biyyam: 'rice', biyam: 'rice', chawal: 'rice', annam: 'rice', 'అన్నం': 'rice',
  'సోనా మసూరి': 'sona masoori', sona: 'sona masoori', masuri: 'masoori',
  'గోధుమ పిండి': 'atta', 'గోధుమ': 'wheat atta', godhuma: 'wheat atta', 'godhuma pindi': 'atta', atta: 'atta', aata: 'atta',
  'పిండి': 'flour', pindi: 'flour', 'రవ్వ': 'rava', ravva: 'rava', suji: 'rava', sooji: 'rava', 'మైదా': 'maida',
  'రాగి': 'ragi', 'శనగపిండి': 'besan', senagapindi: 'besan', 'అటుకులు': 'poha', atukulu: 'poha',
  'పప్పు': 'dal', pappu: 'dal', daal: 'dal', dhal: 'dal',
  'కంది పప్పు': 'toor dal', kandi: 'toor', kandipappu: 'toor dal', 'కంది': 'toor', arhar: 'toor', tur: 'toor',
  'పెసర పప్పు': 'moong dal', pesara: 'moong', pesarapappu: 'moong dal', 'పెసర': 'moong', mung: 'moong',
  'మినప పప్పు': 'urad dal', minapa: 'urad', minapappu: 'urad dal', 'మినప': 'urad', minumulu: 'urad',
  'శనగ పప్పు': 'chana dal', senaga: 'chana', senagapappu: 'chana dal', 'శనగలు': 'chana', chana: 'chana',
  'వేరుశనగ': 'groundnut', 'పల్లీలు': 'groundnut', palli: 'groundnut', pallilu: 'groundnut', verusenaga: 'groundnut', peanut: 'groundnut peanut',
  'నూనె': 'oil', nune: 'oil', noone: 'oil', tel: 'oil', 'పల్లి నూనె': 'groundnut oil', 'నువ్వుల నూనె': 'sesame oil', nuvvula: 'sesame',
  'నెయ్యి': 'ghee', neyyi: 'ghee', 'వెన్న': 'butter', venna: 'butter', makhan: 'butter',
  'కారం': 'chilli powder', karam: 'chilli', 'మిరపకాయలు': 'chilli', mirapakaya: 'chilli', mirchi: 'chilli',
  'పసుపు': 'turmeric', pasupu: 'turmeric', haldi: 'turmeric', 'ధనియాలు': 'coriander', dhaniya: 'coriander', 'జీలకర్ర': 'cumin jeera', jeelakarra: 'cumin jeera',
  'ఆవాలు': 'mustard', avalu: 'mustard', 'చింతపండు': 'tamarind', chintapandu: 'tamarind', imli: 'tamarind',
  'ఉప్పు': 'salt', uppu: 'salt', namak: 'salt', 'చక్కెర': 'sugar', chakkera: 'sugar', 'పంచదార': 'sugar', panchadara: 'sugar', cheeni: 'sugar',
  'బెల్లం': 'jaggery', bellam: 'jaggery', gud: 'jaggery',
  'జీడిపప్పు': 'cashew', jeedipappu: 'cashew', kaju: 'cashew kaju', 'బాదం': 'almond', badam: 'almond', 'ఎండు ద్రాక్ష': 'raisin', kishmish: 'raisin',
  'టీ': 'tea', chai: 'tea chai', 'కాఫీ': 'coffee', kapi: 'coffee', 'బిస్కెట్లు': 'biscuit', biscuits: 'biscuit', 'సేమియా': 'vermicelli', semiya: 'vermicelli',
  'ఊరగాయ': 'pickle', uragaya: 'pickle', achar: 'pickle', avakaya: 'mango pickle', 'ఆవకాయ': 'mango pickle',
  'సబ్బు': 'soap', sabbu: 'soap', 'షాంపూ': 'shampoo', 'పేస్ట్': 'toothpaste', paste: 'toothpaste', 'కొబ్బరి నూనె': 'coconut oil', kobbari: 'coconut',
  // dairy
  'పాలు': 'milk', palu: 'milk', paalu: 'milk', doodh: 'milk', 'పెరుగు': 'curd', perugu: 'curd', dahi: 'curd',
  'మజ్జిగ': 'buttermilk', majjiga: 'buttermilk', chaas: 'buttermilk', 'గుడ్లు': 'eggs', gudlu: 'eggs', anda: 'eggs', egg: 'eggs',
  'పనీర్': 'paneer', 'జున్ను': 'cheese',
  // fruits & veg
  'పండ్లు': 'fruits', pandlu: 'fruits', 'కూరగాయలు': 'vegetables', kooragayalu: 'vegetables', kuragayalu: 'vegetables', sabzi: 'vegetables', veggies: 'vegetables', veg: 'vegetables veg',
  'అరటి': 'banana', 'అరటిపండు': 'banana', aratipandu: 'banana', arati: 'banana', kela: 'banana', 'ఆపిల్': 'apple', seb: 'apple',
  'మామిడి': 'mango', mamidi: 'mango', aam: 'mango', 'బొప్పాయి': 'papaya', boppayi: 'papaya', 'దానిమ్మ': 'pomegranate', danimma: 'pomegranate',
  'కమలా': 'orange', kamala: 'orange', 'ద్రాక్ష': 'grapes', draksha: 'grapes', 'పుచ్చకాయ': 'watermelon', puchakaya: 'watermelon',
  'టమాటా': 'tomato', tamata: 'tomato', tamatar: 'tomato', 'ఉల్లిపాయ': 'onion', 'ఉల్లి': 'onion', ullipaya: 'onion', ulli: 'onion', pyaz: 'onion', pyaaz: 'onion',
  'బంగాళాదుంప': 'potato', 'ఆలూ': 'potato', aloo: 'potato', alu: 'potato', bangaladumpa: 'potato',
  'వంకాయ': 'brinjal', vankaya: 'brinjal', baingan: 'brinjal', 'బెండకాయ': 'bendakaya', bendakaya: 'bendakaya', bhindi: 'bendakaya', okra: 'bendakaya',
  'పచ్చిమిర్చి': 'green chilli', pachimirchi: 'green chilli', 'క్యారెట్': 'carrot', 'క్యాబేజీ': 'cabbage', 'కాలీఫ్లవర్': 'cauliflower', gobi: 'cauliflower gobi',
  'సొరకాయ': 'sorakaya', sorakaya: 'sorakaya', lauki: 'sorakaya', 'మునక్కాయ': 'drumstick', munakkaya: 'drumstick',
  'పాలకూర': 'palakura spinach', palakura: 'palakura spinach', palak: 'palakura spinach', 'గోంగూర': 'gongura', 'కొత్తిమీర': 'coriander leaves', kothimeera: 'coriander leaves',
  'కరివేపాకు': 'curry leaves', karivepaku: 'curry leaves', 'పుదీనా': 'mint', pudina: 'mint', 'అల్లం': 'ginger', allam: 'ginger', adrak: 'ginger',
  'వెల్లుల్లి': 'garlic', vellulli: 'garlic', lehsun: 'garlic', 'నిమ్మకాయ': 'lemon', nimmakaya: 'lemon', nimbu: 'lemon',
  // food
  'బిర్యానీ': 'biryani', biriyani: 'biryani', briyani: 'biryani', biryani: 'biryani', 'భోజనం': 'meals', bhojanam: 'meals', thali: 'meals',
  'చికెన్': 'chicken', kodi: 'chicken', 'మటన్': 'mutton', 'చేప': 'fish', chepa: 'fish', 'టిఫిన్': 'tiffins', tiffin: 'tiffins',
  'ఇడ్లీ': 'idli', idly: 'idli', 'దోస': 'dosa', dosai: 'dosa', 'వడ': 'vada', 'పూరీ': 'poori', puri: 'poori', 'ఉప్మా': 'upma', 'పెసరట్టు': 'pesarattu',
  'కేక్': 'cake', 'బ్రెడ్': 'bread', 'పఫ్': 'puff', 'స్వీట్లు': 'sweets', sweet: 'sweets', mithai: 'sweets', 'లడ్డు': 'laddu', laddoo: 'laddu', ladoo: 'laddu',
  'పూతరేకులు': 'pootharekulu', putharekulu: 'pootharekulu', 'అరిసెలు': 'ariselu', 'కజ్జికాయలు': 'kajjikayalu', 'జిలేబి': 'jalebi', jilebi: 'jalebi',
  'మురుకులు': 'murukulu', chakli: 'murukulu', 'చెక్కలు': 'chekkalu', 'బూంది': 'boondi', namkeen: 'namkeen mixture', mixture: 'mixture',
  // medical
  'మందులు': 'medicine medical', mandulu: 'medicine medical', 'మాత్రలు': 'tablets', matralu: 'tablets', dawai: 'medicine', medicines: 'medicine',
  'జ్వరం': 'paracetamol fever', jvaram: 'paracetamol', fever: 'paracetamol thermometer', 'తలనొప్పి': 'pain relief', headache: 'pain relief paracetamol',
  'దగ్గు': 'cough', daggu: 'cough', 'జలుబు': 'cold', jalubu: 'cold', 'కట్టు': 'bandage', bandaid: 'bandage', 'మాస్క్': 'mask', sanitiser: 'sanitizer',
  'విటమిన్': 'vitamin', 'బీపీ': 'bp monitor', bp: 'bp monitor', 'షుగర్': 'sugar glucometer',
  // home & hardware
  'బల్బు': 'bulb', bulb: 'bulb', light: 'light bulb', 'ఫ్యాన్': 'fan', pankha: 'fan', 'వైరు': 'wire', 'స్విచ్': 'switch', 'పెయింట్': 'paint', rangu: 'paint',
  'సిమెంట్': 'cement', 'ఇసుక': 'sand', isuka: 'sand', 'ఇటుకలు': 'bricks', itukalu: 'bricks', 'కడ్డీలు': 'tmt bar steel', rods: 'tmt bar', saria: 'tmt bar',
  'కుళాయి': 'tap', kulai: 'tap', nal: 'tap', 'పైపు': 'pipe', 'తాళం': 'lock', talam: 'lock', 'మేకులు': 'nails', mekulu: 'nails',
  'కుర్చీ': 'chair', kurchi: 'chair', 'మంచం': 'bed', mancham: 'bed', 'పరుపు': 'mattress', parupu: 'mattress', 'బీరువా': 'almirah wardrobe', beeruva: 'almirah wardrobe',
  // fashion & mobile
  'చీర': 'saree', cheera: 'saree', sari: 'saree', 'చొక్కా': 'shirt', chokka: 'shirt', 'ప్యాంటు': 'trousers jeans', pant: 'trousers jeans', pants: 'trousers jeans',
  'చెప్పులు': 'chappal sandals slippers', cheppulu: 'chappal sandals slippers', chappal: 'chappal slippers', 'బూట్లు': 'shoes', shoe: 'shoes',
  'ఫోన్': 'phone smartphone', mobile: 'smartphone phone', 'ఛార్జర్': 'charger', 'ఇయర్ఫోన్స్': 'earphones', earbuds: 'earbuds', 'కవర్': 'cover',
  tv: 'tv', 'టీవీ': 'tv', fridge: 'refrigerator', 'ఫ్రిజ్': 'refrigerator', 'మిక్సీ': 'mixer grinder', mixie: 'mixer grinder', mixi: 'mixer grinder',
  'కుక్కర్': 'pressure cooker', cooker: 'pressure cooker', iron: 'iron', 'ఇస్త్రీ': 'ironing iron', istri: 'ironing iron',
  // services & study
  'పుస్తకాలు': 'books book', pustakalu: 'books book', 'పుస్తకం': 'book', 'నోటుబుక్': 'notebook', 'పెన్ను': 'pen', 'పెన్సిల్': 'pencil',
  'కటింగ్': 'haircut', cutting: 'haircut', 'హెయిర్ కట్': 'haircut', 'గడ్డం': 'beard', 'ఫేషియల్': 'facial', 'మెహందీ': 'mehendi', mehndi: 'mehendi',
  'బట్టలు ఉతకడం': 'wash', 'ఇస్త్రీ బట్టలు': 'ironing', drycleaning: 'dry clean', 'డ్రై క్లీన్': 'dry clean', dhobi: 'laundry wash ironing',
  'డాక్టర్': 'consultation doctor', doctor: 'consultation', 'టెస్ట్': 'test', 'రక్త పరీక్ష': 'blood test', 'ఎక్స్‌రే': 'x-ray', xray: 'x-ray', scan: 'scan ultrasound',
}

const TELUGU = /[ఀ-౿]/
export function norm(s) {
  return String(s || '').toLowerCase().replace(/[^ఀ-౿a-z0-9]+/g, ' ').trim()
}
const ALIAS_KEYS = Object.keys(ALIASES).map((k) => [norm(k), ALIASES[k]]).sort((a, b) => b[0].length - a[0].length)

// Small spelling mistakes: Levenshtein distance with an early exit.
function within(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return false
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      if (cur[j] < best) best = cur[j]
    }
    if (best > max) return false
    prev = cur
  }
  return prev[b.length] <= max
}

// Turns the typed text into groups of alternatives; every group must match.
export function parseQuery(q) {
  let text = ` ${norm(q)} `
  const groups = []
  for (const [k, v] of ALIAS_KEYS) {
    if (text.includes(` ${k} `)) {
      groups.push([...new Set([...norm(v).split(' '), ...(TELUGU.test(k) ? [] : [k])])])
      text = text.replace(` ${k} `, ' ')
    }
  }
  for (const w of text.split(' ').filter(Boolean)) groups.push([w])
  return groups
}

function wordMatch(alt, words, compact) {
  if (alt.length <= 2) return words.some((w) => w.startsWith(alt)) ? 0.8 : 0
  let best = 0
  for (const w of words) {
    if (w === alt) return 1
    if (w.startsWith(alt)) best = Math.max(best, 0.9)
    else if (alt.length >= 4 && w.includes(alt)) best = Math.max(best, 0.7)
    else if (alt.length >= 4 && w.length >= 3 && alt[0] === w[0] &&
      (within(alt, w, alt.length >= 5 ? 2 : 1) || within(alt, w.slice(0, alt.length), alt.length >= 6 ? 2 : 1))) best = Math.max(best, 0.6)
  }
  if (!best && alt.length >= 4 && compact.includes(alt)) best = 0.6 // "toordal" → "toor dal"
  return best
}

// Index once per catalogue load (useMemo in the page).
export function buildIndex(products, shops, categories) {
  const shopById = new Map(shops.map((s) => [s.id, s]))
  const catName = new Map(categories.map((c) => [c.id, `${c.name} ${c.te || ''}`]))
  return products.map((p) => {
    const s = shopById.get(p.shopId)
    const name = norm(p.name).split(' ')
    const extra = norm(`${p.type} ${p.offer || ''}`).split(' ').filter(Boolean)
    const shop = norm(`${s?.name || ''} ${catName.get(s?.category) || ''}`).split(' ').filter(Boolean)
    return { p, name, extra, shop, compact: norm(p.name).replace(/ /g, '') + norm(p.type).replace(/ /g, '') }
  })
}

// Score every product; groups AND-ed, each group = best of its alternatives.
export function searchProducts(index, q, { limit = 200 } = {}) {
  const groups = parseQuery(q)
  if (!groups.length) return []
  const out = []
  for (const row of index) {
    let score = 0, ok = true
    for (const g of groups) {
      let best = 0
      for (const alt of g) {
        best = Math.max(best,
          wordMatch(alt, row.name, row.compact) * 3,
          wordMatch(alt, row.extra, '') * 2,
          wordMatch(alt, row.shop, '') * 1.2)
      }
      if (!best) { ok = false; break }
      score += best
    }
    // tie-break: shorter names first ("Tomato" before "Tomato Ketchup")
    if (ok) out.push({ p: row.p, score: score - row.name.length * 0.05 })
  }
  out.sort((a, b) => b.score - a.score)
  return out.slice(0, limit)
}

export function shopMatches(shop, q, categories) {
  const groups = parseQuery(q)
  const words = norm(`${shop.name} ${shop.address} ${(categories.find((c) => c.id === shop.category) || {}).name || ''}`).split(' ')
  return groups.length > 0 && groups.every((g) => g.some((alt) => wordMatch(alt, words, words.join(''))))
}
