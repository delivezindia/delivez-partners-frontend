import {
  Apple,
  Baby,
  Bandage,
  Banana,
  Bath,
  Battery,
  Beef,
  Bike,
  BookOpen,
  Brush,
  Cable,
  CakeSlice,
  Candy,
  Carrot,
  ChefHat,
  Cherry,
  Citrus,
  Coffee,
  Cookie,
  CookingPot,
  Croissant,
  CupSoda,
  Drumstick,
  Droplet,
  Egg,
  EggFried,
  FlaskConical,
  Fish,
  Flame,
  Flashlight,
  Flower2,
  Gift,
  GlassWater,
  Grape,
  Ham,
  Headphones,
  HeartPulse,
  IceCreamCone,
  Lamp,
  Leaf,
  LeafyGreen,
  Lightbulb,
  Milk,
  Nut,
  PawPrint,
  Pill,
  Pizza,
  Popcorn,
  Printer,
  Salad,
  Sandwich,
  Shirt,
  Shell,
  ShoppingBasket,
  ShoppingCart,
  Smartphone,
  Snowflake,
  Soup,
  Sparkles,
  SprayCan,
  Sprout,
  Store,
  Syringe,
  TestTube,
  Thermometer,
  UtensilsCrossed,
  Wheat,
  type LucideIcon,
} from 'lucide-react';
import type { StoreCard, Vertical } from './types';

/*
 * Icons for shops and products while they have no photos (one icon set, lucide): picked from the shop's type, or words
 * in the dish, product or aisle name. First match wins.
 */

/** A colour and icon per kind of shop (store type), for the coloured band on store cards. */
const TYPE: Record<string, { icon: LucideIcon; bg: string }> = {
  RESTAURANT: { icon: UtensilsCrossed, bg: '#9A3412' },
  CLOUD_KITCHEN: { icon: ChefHat, bg: '#B45309' },
  CAFE: { icon: Coffee, bg: '#57341A' },
  BAKERY: { icon: Croissant, bg: '#92580F' },
  SWEETS: { icon: Candy, bg: '#9D174D' },
  SUPERMARKET: { icon: ShoppingCart, bg: '#15803D' },
  KIRANA: { icon: Store, bg: '#166534' },
  GROCERY: { icon: ShoppingBasket, bg: '#17803A' },
  PHARMACY_RETAIL: { icon: Pill, bg: '#1E5BB8' },
  DIAGNOSTIC_LAB: { icon: FlaskConical, bg: '#0E7490' },
  BABY_CARE: { icon: Baby, bg: '#C2410C' },
  PET_CARE: { icon: PawPrint, bg: '#8A4B12' },
  ELECTRONICS: { icon: Smartphone, bg: '#1E3A8A' },
  BEAUTY_WELLNESS: { icon: Sparkles, bg: '#9D174D' },
  MEAT_FISH: { icon: Fish, bg: '#9F1239' },
  CLOTHING: { icon: Shirt, bg: '#6D28D9' },
  FLOWER: { icon: Flower2, bg: '#BE185D' },
  PRINTING: { icon: Printer, bg: '#334155' },
  HOUSEHOLD_LIFESTYLE: { icon: Lamp, bg: '#0F766E' },
  STREET_VENDOR: { icon: Bike, bg: '#C2470B' },
  SOCIETY_VENDOR: { icon: Milk, bg: '#1D4ED8' },
  OTHER: { icon: Gift, bg: '#7A1E5A' },
};
const VERTICAL: Record<Vertical, { icon: LucideIcon; bg: string }> = {
  EAT: TYPE.RESTAURANT,
  GROCERY: TYPE.GROCERY,
  PHARMACY: TYPE.PHARMACY_RETAIL,
  DIAGNOSTICS: TYPE.DIAGNOSTIC_LAB,
  LOCAL_STORES: { icon: Store, bg: '#7A3FC0' },
};

/** Restaurants: the dish or cuisine they are known for. */
const DISH: [RegExp, LucideIcon][] = [
  [/pizza/i, Pizza],
  [/biri?y?ani|pulao|curry|north indian|mughlai|andhra|chettinad|thali/i, CookingPot],
  [/dosa|idli|south indian|udupi|breakfast/i, EggFried],
  [/burger|sandwich|roll|wrap|fast food/i, Sandwich],
  [/chicken|tandoor|kebab|kabab|grill/i, Drumstick],
  [/fish|seafood|coastal/i, Fish],
  [/noodle|chinese|soup|momo/i, Soup],
  [/salad|healthy/i, Salad],
  [/chaat|snack|samosa/i, Popcorn],
  [/ice ?cream|kulfi|dessert/i, IceCreamCone],
  [/cake|bakery|pastry|sweet/i, CakeSlice],
  // Drinks last: most kitchens list beverages next to what they cook.
  [/coffee|caf[eé]|chai|\btea\b/i, Coffee],
  [/shake|juice|beverage|soda|lassi/i, CupSoda],
];

/** Icon and band colour for a shop: its type, then (for restaurants) what it cooks. */
export function storeLook(s: Pick<StoreCard, 'storeType' | 'vertical' | 'name' | 'cuisines' | 'description'>): { icon: LucideIcon; bg: string } {
  const base = TYPE[s.storeType] ?? VERTICAL[s.vertical];
  if (s.vertical !== 'EAT') return base;
  const text = [s.name, ...s.cuisines, s.description ?? ''].join(' ');
  const dish = DISH.find(([re]) => re.test(text))?.[1];
  return dish ? { ...base, icon: dish } : base;
}

const PRODUCTS: [RegExp, LucideIcon][] = [
  // Lab tests before food words ("blood sugar").
  [/\btest|blood|thyroid|diabet|hba1c|cbc|lipid|urine|profile|panel|vitamin/i, TestTube],
  [/heart|\bbp\b|pressure|ecg/i, HeartPulse],
  [/banana/i, Banana],
  [/apple/i, Apple],
  [/grape/i, Grape],
  [/orange|mosambi|lemon|lime|citrus/i, Citrus],
  [/cherr|berr|pomegranate|watermelon|mango|papaya|guava|fruit/i, Cherry],
  [/carrot|tomato|onion|potato|veg|palak|spinach|bhindi|okra|cucumber|coriander/i, Carrot],
  [/milk|curd|dahi|yogurt|yoghurt|paneer|cheese|butter|ghee|dairy/i, Milk],
  [/\begg/i, Egg],
  [/bread|bun|pav|croissant|rusk|bakery/i, Croissant],
  [/cake|pastry|brownie/i, CakeSlice],
  [/biscuit|cookie/i, Cookie],
  [/chips|namkeen|bhujia|popcorn|snack|chaat|puri|tikki|samosa|pakora/i, Popcorn],
  [/chocolate|candy|sweet|sugar|jaggery|mithai/i, Candy],
  [/ice ?cream|kulfi/i, IceCreamCone],
  [/atta|flour|maida|wheat|suji|rava|rice|basmati|poha|dal\b|lentil|grain|staple/i, Wheat],
  [/almond|cashew|dry ?fruit|peanut|nut/i, Nut],
  [/coffee|\btea\b|chai/i, Coffee],
  [/juice|cola|soda|soft drink|beverage|drink/i, CupSoda],
  [/water/i, GlassWater],
  [/chicken|mutton|meat|kebab/i, Drumstick],
  [/beef|pork/i, Beef],
  [/fish|prawn|seafood/i, Fish],
  [/pizza/i, Pizza],
  [/biri?y?ani|curry|thali|pulao|dal makhani|chole|rajma/i, CookingPot],
  [/sandwich|burger|roll|wrap/i, Sandwich],
  [/soup|noodle|maggi|pasta/i, Soup],
  [/salad/i, Salad],
  [/dosa|idli|uttapam|omelette/i, EggFried],
  [/masala|spice|chill?i/i, Flame],
  [/organic|herb|leaf|tulsi/i, Leaf],
  [/seed|sprout/i, Sprout],
  [/thermometer/i, Thermometer],
  [/syringe|injection|insulin/i, Syringe],
  [/bandage|plaster|first ?aid/i, Bandage],
  [/tablet|capsule|syrup|paracetamol|ors|cetirizine|medicine|pill|drops/i, Pill],
  [/diaper|wipes|baby/i, Baby],
  [/dog|cat|pet/i, PawPrint],
  [/soap|shampoo|lotion|cream|face ?wash|tooth|bath|body/i, Bath],
  [/detergent|cleaner|phenyl|dishwash|disinfect|spray/i, SprayCan],
  [/flower|rose|bouquet|garland|mala/i, Flower2],
  [/gift|hamper/i, Gift],
  [/power ?bank|batter(y|ies)/i, Battery],
  [/torch|flashlight/i, Flashlight],
  [/bulb|batten|\bled\b|lamp/i, Lightbulb],
  [/earphone|headphone|earbud/i, Headphones],
  [/cable|charger|adapter|extension|plug/i, Cable],
  [/phone|mobile/i, Smartphone],
  [/shirt|kurta|dress|saree|t-?shirt|jeans/i, Shirt],
  [/print|xerox|copy|lamination/i, Printer],
  [/book|notebook|pen\b|pencil|stationery/i, BookOpen],
];

/** Icon for a product: its name first, then the aisle it is in. */
export function itemIcon(name: string, aisle = '', fallback: LucideIcon = ShoppingBasket): LucideIcon {
  return PRODUCTS.find(([re]) => re.test(name))?.[1] ?? PRODUCTS.find(([re]) => re.test(aisle))?.[1] ?? fallback;
}

/** Dishes and cuisines on the Food and Street Cart pages: "Paneer Tikka Roll" → Sandwich, "South Indian" → EggFried. */
const FOOD: [RegExp, LucideIcon][] = [
  [/biri?y?ani|pulao/i, CookingPot],
  [/roll|wrap|kathi|shawarma|frankie/i, Sandwich],
  [/dosa|idli|vada|uttapam|south indian|udupi/i, EggFried],
  [/pizza/i, Pizza],
  [/noodle|chinese|chowmein|hakka|manchurian/i, Soup],
  [/momo|dumpling/i, Soup],
  [/burger/i, Sandwich],
  [/fries|fast food/i, Popcorn],
  [/sandwich|toast/i, Sandwich],
  [/coffee|caf[eé]|chai|\btea\b|beverage/i, Coffee],
  [/shake|smoothie|juice|lassi|mojito|soda/i, CupSoda],
  [/ice ?cream|kulfi|sundae/i, IceCreamCone],
  [/cake|dessert|sweet|bakery|bakers|pastry|brownie|cookie|mithai/i, CakeSlice],
  [/salad|healthy/i, Salad],
  [/thali|meal|combo/i, UtensilsCrossed],
  [/chicken|tandoor|kebab|kabab|tikka|seekh|grill/i, Drumstick],
  [/mutton|keema|meat/i, Ham],
  [/fish|prawn|seafood|coastal/i, Fish],
  [/\begg|omelette/i, Egg],
  [/paneer/i, Milk],
  [/chole|rajma|dal\b|curry|north indian|punjabi|mughlai/i, CookingPot],
  [/paratha|naan|roti|kulcha/i, Wheat],
  [/rice|chawal|khichdi/i, CookingPot],
  [/chaat|pani ?puri|samosa|street|pav/i, Popcorn],
  [/andhra|chettinad|spicy/i, Flame],
  [/bowl/i, Soup],
  [/breakfast/i, EggFried],
];
const pick = (list: [RegExp, LucideIcon][], text: string) => list.find(([re]) => re.test(text))?.[1];

/** A dish or a cuisine. */
export const foodIcon = (text: string): LucideIcon => pick(FOOD, text) ?? UtensilsCrossed;

/** [match, icon, tint] — aisles carry a tint so their products share it. */
const AISLES: [RegExp, LucideIcon, string][] = [
  [/fruit/i, Apple, '#E3F4E8'],
  [/vegetable|veggies|sabzi|greens/i, Carrot, '#E3F4E8'],
  [/dairy|milk|egg/i, Milk, '#EEF3FF'],
  [/bakery|bread/i, Croissant, '#FFF8EC'],
  [/staple|atta|rice|dal|pulse|grain|flour/i, Wheat, '#FFF4C2'],
  [/oil|ghee/i, Droplet, '#FFF4C2'],
  [/masala|spice/i, Flame, '#FFE8D6'],
  [/snack|namkeen|biscuit/i, Popcorn, '#FDE2E4'],
  [/beverage|drink|juice|tea|coffee/i, CupSoda, '#FDE2E4'],
  [/sweet|chocolate/i, Candy, '#FDE2E4'],
  [/instant|ready|noodle/i, Soup, '#FFE8D6'],
  [/frozen|ice ?cream/i, Snowflake, '#E5EDFF'],
  [/meat|chicken|fish|mutton/i, Drumstick, '#FFE8D6'],
  [/personal|beauty|bath|hygiene/i, Bath, '#F3E8FF'],
  [/clean|laundry|detergent/i, SprayCan, '#E5EDFF'],
  [/home care|household|home/i, Brush, '#F2F2EF'],
  [/baby/i, Baby, '#FFF8EC'],
  [/pet/i, PawPrint, '#FFE8D6'],
];

/** A grocery aisle: icon and tile colour. */
export function aisleLook(name: string): { icon: LucideIcon; tint: string } {
  const hit = AISLES.find(([re]) => re.test(name));
  return { icon: hit?.[1] ?? ShoppingCart, tint: hit?.[2] ?? '#F2F2EF' };
}

/** A grocery product, falling back to its aisle. */
export const productIcon = (name: string, aisle: string) => itemIcon(name, '', aisleLook(aisle).icon);

/** Anything a shop sells: a dish if it reads like one, otherwise a grocery product or its aisle. */
export const menuItemIcon = (name: string, aisle: string) => pick(FOOD, name) ?? productIcon(name, aisle);

/** Aisles of fresh produce and dairy get the "Fresh" tag. */
export const isFreshAisle = (name: string) => /fruit|vegetable|veggies|sabzi|greens|dairy|milk|egg|bakery|bread|meat|fish|chicken/i.test(name);

const TINTS = ['#FDE2E4', '#FFF4C2', '#E3F4E8', '#FFF8EC', '#F3E8FF', '#E5EDFF', '#FFE8D6', '#F2F2EF'];
/** The same soft colour for the same shop every time. */
export const tintFor = (id: string) => TINTS[[...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7) % TINTS.length];

const VENDORS: [RegExp, LucideIcon][] = [
  [/chaat|pani ?puri|golgappa|tikki|bhel/i, Popcorn],
  [/dairy|milk|doodh/i, Milk],
  [/coconut|nariyal/i, Shell],
  [/juice|sugarcane|ganna/i, CupSoda],
  [/fruit|phal/i, Cherry],
  [/vegetable|sabzi|veggies/i, LeafyGreen],
  [/\btea\b|chai|coffee/i, Coffee],
  [/flower|phool|mala|garland/i, Flower2],
  [/kulfi|ice ?cream|gola/i, IceCreamCone],
  [/corn|bhutta/i, Wheat],
  [/momo/i, Soup],
  [/dosa|idli|tiffin|breakfast|poha/i, EggFried],
  [/vada ?pav/i, Sandwich],
];

/** A street or society vendor, from its name and what it says it sells. */
export const vendorIcon = (text: string): LucideIcon => pick(VENDORS, text) ?? ShoppingCart;

