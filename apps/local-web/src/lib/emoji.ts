/*
 * Emoji art for the shop-list pages while shops have no photos:
 * picked from words in the dish, cuisine, product or aisle name. First match wins.
 */

const FOOD: [RegExp, string][] = [
  [/biri?y?ani|pulao/i, '🍛'],
  [/roll|wrap|kathi|shawarma|frankie/i, '🌯'],
  [/dosa|idli|vada|uttapam|south indian|udupi/i, '🥞'],
  [/pizza/i, '🍕'],
  [/noodle|chinese|chowmein|hakka|manchurian/i, '🍜'],
  [/momo|dumpling/i, '🥟'],
  [/burger/i, '🍔'],
  [/fries|fast food/i, '🍟'],
  [/sandwich|toast/i, '🥪'],
  [/coffee|caf[eé]|chai|\btea\b|beverage/i, '☕'],
  [/shake|smoothie|juice|lassi|mojito|soda/i, '🥤'],
  [/ice ?cream|kulfi|sundae/i, '🍨'],
  [/cake|dessert|sweet|bakery|bakers|pastry|brownie|cookie|mithai/i, '🧁'],
  [/salad|healthy/i, '🥗'],
  [/thali|meal|combo/i, '🍱'],
  [/chicken|tandoor|kebab|kabab|tikka|seekh|grill/i, '🍗'],
  [/mutton|keema|meat/i, '🍖'],
  [/fish|prawn|seafood|coastal/i, '🦐'],
  [/\begg|omelette/i, '🥚'],
  [/paneer/i, '🧀'],
  [/chole|rajma|dal\b|curry|north indian|punjabi|mughlai/i, '🥘'],
  [/paratha|naan|roti|kulcha/i, '🫓'],
  [/rice|chawal|khichdi/i, '🍚'],
  [/chaat|pani ?puri|samosa|street|pav/i, '🥙'],
  [/andhra|chettinad|spicy/i, '🌶️'],
  [/bowl/i, '🍲'],
  [/breakfast/i, '🍳'],
];

/** [match, emoji, tint] — aisles carry a tint so their products share it. */
const AISLES: [RegExp, string, string][] = [
  [/fruit/i, '🍎', '#E3F4E8'],
  [/vegetable|veggies|sabzi|greens/i, '🥦', '#E3F4E8'],
  [/dairy|milk|egg/i, '🥛', '#EEF3FF'],
  [/bakery|bread/i, '🍞', '#FFF8EC'],
  [/staple|atta|rice|dal|pulse|grain|flour/i, '🌾', '#FFF4C2'],
  [/oil|ghee/i, '🫒', '#FFF4C2'],
  [/masala|spice/i, '🌶️', '#FFE8D6'],
  [/snack|namkeen|biscuit/i, '🍿', '#FDE2E4'],
  [/beverage|drink|juice|tea|coffee/i, '🧃', '#FDE2E4'],
  [/sweet|chocolate/i, '🍫', '#FDE2E4'],
  [/instant|ready|noodle/i, '🍜', '#FFE8D6'],
  [/frozen|ice ?cream/i, '🧊', '#E5EDFF'],
  [/meat|chicken|fish|mutton/i, '🍗', '#FFE8D6'],
  [/personal|beauty|bath|hygiene/i, '🧼', '#F3E8FF'],
  [/clean|laundry|detergent/i, '🫧', '#E5EDFF'],
  [/home care|household|home/i, '🧴', '#F2F2EF'],
  [/baby/i, '👶', '#FFF8EC'],
  [/pet/i, '🐾', '#FFE8D6'],
];

const PRODUCTS: [RegExp, string][] = [
  [/tomato/i, '🍅'],
  [/onion/i, '🧅'],
  [/potato|aloo/i, '🥔'],
  [/banana/i, '🍌'],
  [/apple/i, '🍎'],
  [/mango/i, '🥭'],
  [/grape/i, '🍇'],
  [/orange|mosambi/i, '🍊'],
  [/lemon|lime/i, '🍋'],
  [/watermelon/i, '🍉'],
  [/carrot/i, '🥕'],
  [/chill?i/i, '🌶️'],
  [/garlic/i, '🧄'],
  [/ginger/i, '🫚'],
  [/palak|spinach|methi|coriander|mint|leafy/i, '🥬'],
  [/cucumber|lady ?finger|bhindi|okra/i, '🥒'],
  [/broccoli|cauliflower/i, '🥦'],
  [/corn/i, '🌽'],
  [/milk/i, '🥛'],
  [/curd|dahi|yogurt|yoghurt/i, '🥣'],
  [/butter|ghee/i, '🧈'],
  [/cheese|paneer/i, '🧀'],
  [/\begg/i, '🥚'],
  [/bread|bun|pav/i, '🍞'],
  [/biscuit|cookie|rusk/i, '🍪'],
  [/chips|crisps/i, '🥔'],
  [/namkeen|bhujia|mixture/i, '🍿'],
  [/chocolate/i, '🍫'],
  [/noodle|maggi|pasta/i, '🍜'],
  [/rice|basmati|poha/i, '🍚'],
  [/atta|flour|maida|wheat|suji|rava/i, '🌾'],
  [/dal\b|lentil|chana|rajma|moong|toor|urad/i, '🫘'],
  [/oil/i, '🫒'],
  [/salt/i, '🧂'],
  [/sugar|jaggery|gur/i, '🍬'],
  [/honey/i, '🍯'],
  [/\btea\b|chai/i, '🍵'],
  [/coffee/i, '☕'],
  [/juice/i, '🧃'],
  [/water/i, '💧'],
  [/cola|soft drink|soda/i, '🥤'],
  [/almond|cashew|dry ?fruit|peanut/i, '🥜'],
  [/jam|ketchup|sauce/i, '🥫'],
  [/masala|spice|turmeric|haldi|jeera|cumin/i, '🌶️'],
  [/soap|handwash|body ?wash/i, '🧼'],
  [/shampoo|lotion|cream/i, '🧴'],
  [/tooth/i, '🪥'],
  [/detergent|washing/i, '🫧'],
  [/cleaner|phenyl|dishwash/i, '🧽'],
  [/tissue|toilet|napkin/i, '🧻'],
  [/diaper|baby/i, '👶'],
  [/dog|cat|pet/i, '🐾'],
  [/chicken/i, '🍗'],
  [/mutton|meat/i, '🥩'],
  [/fish|prawn/i, '🐟'],
  [/flower|rose/i, '💐'],
  [/power ?bank|batter(y|ies)/i, '🔋'],
  [/torch/i, '🔦'],
  [/bulb|batten|\bled\b/i, '💡'],
  [/earphone|headphone/i, '🎧'],
  [/cable|charger|extension|adapter|plug/i, '🔌'],
  [/\bmop\b|broom/i, '🧹'],
  [/thermometer/i, '🌡️'],
  [/tablet|\btabs\b|capsule|syrup|\bors\b/i, '💊'],
];

const pick = <T extends [RegExp, ...unknown[]]>(list: T[], text: string) => list.find(([re]) => re.test(text));

/** A dish or a cuisine: "Paneer Tikka Roll" → 🌯, "South Indian" → 🥞. */
export const foodEmoji = (text: string) => pick(FOOD, text)?.[1] ?? '🍽️';

/** A grocery aisle: emoji and tile colour. */
export function aisleLook(name: string) {
  const hit = pick(AISLES, name);
  return { emoji: hit?.[1] ?? '🛒', tint: hit?.[2] ?? '#F2F2EF' };
}

/** A grocery product, falling back to its aisle. */
export const productEmoji = (name: string, aisle: string) => pick(PRODUCTS, name)?.[1] ?? aisleLook(aisle).emoji;

/** Aisles of fresh produce and dairy get the "Fresh" tag. */
export const isFreshAisle = (name: string) => /fruit|vegetable|veggies|sabzi|greens|dairy|milk|egg|bakery|bread|meat|fish|chicken/i.test(name);

const TINTS = ['#FDE2E4', '#FFF4C2', '#E3F4E8', '#FFF8EC', '#F3E8FF', '#E5EDFF', '#FFE8D6', '#F2F2EF'];
/** The same soft colour for the same shop every time. */
export const tintFor = (id: string) => TINTS[[...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7) % TINTS.length];

const VENDORS: [RegExp, string][] = [
  [/chaat|pani ?puri|golgappa|tikki|bhel/i, '🥙'],
  [/dairy|milk|doodh/i, '🥛'],
  [/coconut|nariyal/i, '🥥'],
  [/juice|sugarcane|ganna/i, '🧃'],
  [/fruit|phal/i, '🍉'],
  [/vegetable|sabzi|veggies/i, '🥬'],
  [/\btea\b|chai|coffee/i, '☕'],
  [/flower|phool|mala|garland/i, '🌼'],
  [/kulfi|ice ?cream|gola/i, '🍧'],
  [/corn|bhutta/i, '🌽'],
  [/momo/i, '🥟'],
  [/dosa|idli|tiffin|breakfast|poha/i, '🫓'],
  [/vada ?pav/i, '🍔'],
];

/** A street or society vendor, from its name and what it says it sells. */
export const vendorEmoji = (text: string) => pick(VENDORS, text)?.[1] ?? '🛒';

/** Anything a shop sells: a dish if it reads like one, otherwise a grocery product or its aisle. */
export function itemEmoji(name: string, aisle: string) {
  const dish = foodEmoji(name);
  return dish !== '🍽️' ? dish : productEmoji(name, aisle);
}
