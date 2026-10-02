/**
 * THE SOUL VASTRA - Structured Product Catalog Data
 * Premium Japanese-inspired Streetwear
 */

const SOUL_PRODUCTS = [
  {
    id: "dawn-of-discipline",
    name: "DAWN OF DISCIPLINE",
    subtitle: "ECLIPSE OVERSIZED TEE",
    category: "OVERSIZED",
    categoryLabel: "Oversized T-Shirt",
    collection: "ECLIPSE",
    price: 1999,
    originalPrice: 2499,
    rating: 4.9,
    reviewsCount: 142,
    badge: "BEST SELLER",
    isFeatured: true,
    image: "assets/images/product-dawn-discipline-main.jpg",
    gallery: [
      "assets/images/product-dawn-discipline-main.jpg",
      "assets/images/product-dawn-detail.jpg",
      "assets/images/product-dawn-model.jpg",
      "assets/images/product-dawn-alt.jpg"
    ],
    description: "Crafted for those who rise in silence. Premium heavyweight cotton. Oversized fit. Built to last.",
    story: "Forged in midnight shades, the Dawn of Discipline represents the unwavering samurai spirit—calm in turbulence, lethal in execution. Features a high-contrast ink-brush warrior graphic spanning the spine.",
    fabric: "280 GSM 100% Combed Terry Cotton",
    fit: "Signature Boxy Oversized Streetwear Fit",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Onyx Black", "Charcoal Smoke"],
    tags: ["BEST SELLERS", "OVERSIZED"],
    inStock: true
  },
  {
    id: "rising",
    name: "RISING",
    subtitle: "CRIMSON OVERSIZED TEE",
    category: "OVERSIZED",
    categoryLabel: "Oversized T-Shirt",
    collection: "CRIMSON",
    price: 1999,
    originalPrice: 2399,
    rating: 4.8,
    reviewsCount: 98,
    badge: "NEW ARRIVAL",
    isFeatured: true,
    image: "assets/images/model-rising.jpg",
    gallery: [
      "assets/images/model-rising.jpg",
      "assets/images/cat-oversized-tees.jpg"
    ],
    description: "Embody the awakening warrior. Circular crimson sun with bold ink brush warrior emblem for relentless ambition.",
    story: "The Rising print honors the ronin who awakens before the world stirs. Pure discipline channeled into wearable art.",
    fabric: "280 GSM Heavyweight Terry Cotton",
    fit: "Drop-Shoulder Oversized",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Onyx Black"],
    tags: ["NEW ARRIVALS", "OVERSIZED"],
    inStock: true
  },
  {
    id: "shinigami",
    name: "SHINIGAMI",
    subtitle: "SHADOW OVERSIZED TEE",
    category: "OVERSIZED",
    categoryLabel: "Oversized T-Shirt",
    collection: "SHADOW",
    price: 2199,
    originalPrice: 2699,
    rating: 5.0,
    reviewsCount: 167,
    badge: "LIMITED DROP",
    isFeatured: true,
    image: "assets/images/model-shinigami.jpg",
    gallery: [
      "assets/images/model-shinigami.jpg",
      "assets/images/cat-oversized-tees.jpg"
    ],
    description: "Dark graphic aesthetic meets ancient warrior lore. Tailored in luxury off-white heavyweight knit.",
    story: "In warrior lore, the Shinigami invites the fighter to confront mortality without fear. High-density discharge back print with graphic emblem panels.",
    fabric: "290 GSM Ultra-Dense French Terry Cotton",
    fit: "Boxy Oversized Silhouette",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Ivory Bone", "Onyx Black"],
    tags: ["BEST SELLERS", "OVERSIZED"],
    inStock: true
  },
  {
    id: "discipline",
    name: "DISCIPLINE",
    subtitle: "RONIN ROUND NECK TEE",
    category: "ROUND NECK",
    categoryLabel: "Round Neck T-Shirt",
    collection: "RONIN",
    price: 1799,
    originalPrice: 2199,
    rating: 4.9,
    reviewsCount: 112,
    badge: "CORE ESSENTIAL",
    isFeatured: true,
    image: "assets/images/model-discipline.jpg",
    gallery: [
      "assets/images/model-discipline.jpg",
      "assets/images/cat-roundneck-tees.jpg"
    ],
    description: "Discipline is armor. Classic athletic round neck cut engineered with dense ink-wash warrior artwork.",
    story: "Not every soul is worn; some are forged through continuous reps of discipline. Made to be your everyday statement of intent.",
    fabric: "240 GSM Pre-Shrunk Bio-Washed Combed Cotton",
    fit: "Athletic Regular Fit",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Onyx Black", "Bleached White"],
    tags: ["ROUND NECK", "BEST SELLERS"],
    inStock: true
  },
  {
    id: "lone-warrior",
    name: "LONE WARRIOR",
    subtitle: "ECLIPSE OVERSIZED TEE",
    category: "OVERSIZED",
    categoryLabel: "Oversized T-Shirt",
    collection: "ECLIPSE",
    price: 2099,
    originalPrice: 2599,
    rating: 4.9,
    reviewsCount: 84,
    badge: "TRENDING",
    isFeatured: true,
    image: "assets/images/model-lone-warrior.jpg",
    gallery: [
      "assets/images/model-lone-warrior.jpg",
      "assets/images/cat-oversized-tees.jpg"
    ],
    description: "The solitude of mastery. Pristine white base crowned with the lone samurai silhouette against the blood moon.",
    story: "Walking alone does not signify weakness; it demonstrates the strength to forge a new path where none existed before.",
    fabric: "280 GSM Heavyweight French Terry",
    fit: "Relaxed Oversized Fit",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Ivory White"],
    tags: ["NEW ARRIVALS", "OVERSIZED"],
    inStock: true
  },
  {
    id: "focus",
    name: "FOCUS",
    subtitle: "RONIN ROUND NECK TEE",
    category: "ROUND NECK",
    categoryLabel: "Round Neck T-Shirt",
    collection: "RONIN",
    price: 1799,
    originalPrice: 2199,
    rating: 4.8,
    reviewsCount: 76,
    badge: "CORE ESSENTIAL",
    isFeatured: true,
    image: "assets/images/model-focus.jpg",
    gallery: [
      "assets/images/model-focus.jpg",
      "assets/images/cat-roundneck-tees.jpg"
    ],
    description: "One arrow. One strike. Single-minded warrior posture with distressed typography.",
    story: "A master archer looks only at the center of the target. Strip away noise, eliminate hesitation.",
    fabric: "240 GSM Heavy Cotton Jersey",
    fit: "Classic Round Neck Fit",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Onyx Black"],
    tags: ["ROUND NECK"],
    inStock: true
  },
  {
    id: "shadow-ronin",
    name: "SHADOW",
    subtitle: "SHADOW DROP OVERSIZED TEE",
    category: "OVERSIZED",
    categoryLabel: "Oversized T-Shirt",
    collection: "SHADOW",
    price: 2199,
    originalPrice: 2699,
    rating: 5.0,
    reviewsCount: 63,
    badge: "SIGNATURE",
    isFeatured: false,
    image: "assets/images/collection-shadow.jpg",
    gallery: [
      "assets/images/collection-shadow.jpg",
      "assets/images/product-dawn-detail.jpg"
    ],
    description: "Shadow drop signature tee. Deep black wash with intricate samurai armor chest motif.",
    story: "The shadow warrior moves unseen. A piece crafted for the minimalist who values subtle lethal detail.",
    fabric: "280 GSM Heavyweight Terry",
    fit: "Oversized Boxy Fit",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Midnight Black"],
    tags: ["OVERSIZED", "BEST SELLERS"],
    inStock: true
  },
  {
    id: "ronin-blade",
    name: "RONIN",
    subtitle: "RONIN DROP OVERSIZED TEE",
    category: "OVERSIZED",
    categoryLabel: "Oversized T-Shirt",
    collection: "RONIN",
    price: 2199,
    originalPrice: 2599,
    rating: 4.9,
    reviewsCount: 88,
    badge: "LIMITED DROP",
    isFeatured: false,
    image: "assets/images/collection-ronin.jpg",
    gallery: [
      "assets/images/collection-ronin.jpg"
    ],
    description: "Red warrior crest with crossed katana insignia. Statement heavyweight oversized streetwear.",
    story: "Masterless and self-governed. The Ronin tee embodies the spirit of self-sovereignty.",
    fabric: "280 GSM Terry Cotton",
    fit: "Oversized Fit",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Onyx Black"],
    tags: ["OVERSIZED"],
    inStock: true
  },
  {
    id: "eclipse-scroll",
    name: "ECLIPSE",
    subtitle: "ECLIPSE DROP OVERSIZED TEE",
    category: "OVERSIZED",
    categoryLabel: "Oversized T-Shirt",
    collection: "ECLIPSE",
    price: 1999,
    originalPrice: 2499,
    rating: 4.8,
    reviewsCount: 71,
    badge: "SIGNATURE",
    isFeatured: false,
    image: "assets/images/collection-eclipse.jpg",
    gallery: [
      "assets/images/collection-eclipse.jpg"
    ],
    description: "Distressed vertical warrior scroll graphic on pure heavyweight midnight cotton.",
    story: "When the sun is blocked by the moon, the warrior's focus becomes crystalline.",
    fabric: "280 GSM 100% Combed Cotton",
    fit: "Oversized Drop-Shoulder",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Washed Black"],
    tags: ["OVERSIZED", "NEW ARRIVALS"],
    inStock: true
  },
  {
    id: "crimson-slash",
    name: "CRIMSON",
    subtitle: "CRIMSON DROP OVERSIZED TEE",
    category: "OVERSIZED",
    categoryLabel: "Oversized T-Shirt",
    collection: "CRIMSON",
    price: 2299,
    originalPrice: 2799,
    rating: 5.0,
    reviewsCount: 94,
    badge: "LIMITED DROP",
    isFeatured: false,
    image: "assets/images/collection-crimson.jpg",
    gallery: [
      "assets/images/collection-crimson.jpg"
    ],
    description: "Slash print in blood crimson ink. Angular strokes celebrating decisive action.",
    story: "Action without hesitation. Hand-drawn brush strokes cured with heat-treated crimson pigment.",
    fabric: "290 GSM Heavy French Terry",
    fit: "Oversized Boxy Silhouette",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Blood Crimson", "Pitch Black"],
    tags: ["OVERSIZED", "LIMITED DROPS"],
    inStock: true
  }
];

const SOUL_COLLECTIONS = [
  {
    id: "shadow",
    name: "SHADOW",
    label: "COLLECTION",
    image: "assets/images/collection-shadow.jpg",
    tagline: "Move unseen. Strike without hesitation.",
    description: "Deep charcoal and midnight black treatments with stealth matte graphics.",
    itemCount: "4 PIECES"
  },
  {
    id: "ronin",
    name: "RONIN",
    label: "COLLECTION",
    image: "assets/images/collection-ronin.jpg",
    tagline: "No master. Uncompromising discipline.",
    description: "Circular samurai crests and raw edge heavyweight cuts.",
    itemCount: "5 PIECES"
  },
  {
    id: "eclipse",
    name: "ECLIPSE",
    label: "COLLECTION",
    image: "assets/images/collection-eclipse.jpg",
    tagline: "When darkness conquers the horizon.",
    description: "Ancient vertical warrior scripts along the warrior's spine.",
    itemCount: "4 PIECES"
  },
  {
    id: "crimson",
    name: "CRIMSON",
    label: "COLLECTION",
    image: "assets/images/collection-crimson.jpg",
    tagline: "Forged in discipline and fire.",
    description: "Deep blood-red accents and fierce warrior strokes.",
    itemCount: "3 PIECES"
  }
];

// Helper to format currency
function formatCurrency(amount) {
  return "₹" + amount.toLocaleString("en-IN") + ".00";
}
