/**
 * Default categories seeded for every new user.
 * Based on the user's Buddy app categories.
 */
export const DEFAULT_CATEGORIES: {
    name: string;
    type: "expense" | "investment";
    icon: string;
    color: string;
}[] = [
    { name: "Investments", type: "investment", icon: "trending-up", color: "#4CAF50" },
    { name: "Rent", type: "expense", icon: "home", color: "#FF9800" },
    { name: "Food", type: "expense", icon: "utensils", color: "#E91E63" },
    { name: "Groceries", type: "expense", icon: "shopping-cart", color: "#8BC34A" },
    { name: "Shopping", type: "expense", icon: "shopping-bag", color: "#F44336" },
    { name: "Electronics", type: "expense", icon: "smartphone", color: "#9C27B0" },
    { name: "Home Supplies", type: "expense", icon: "lamp", color: "#00BCD4" },
    { name: "Services", type: "expense", icon: "wrench", color: "#FF5722" },
    { name: "Rapido", type: "expense", icon: "bike", color: "#795548" },
    { name: "Entertainment", type: "expense", icon: "music", color: "#E040FB" },
    { name: "Taxi", type: "expense", icon: "car", color: "#FFC107" },
    { name: "Doctor", type: "expense", icon: "heart-pulse", color: "#F44336" },
    { name: "Cinema", type: "expense", icon: "film", color: "#673AB7" },
    { name: "Electricity", type: "expense", icon: "zap", color: "#FFEB3B" },
    { name: "Flight", type: "expense", icon: "plane", color: "#2196F3" },
    { name: "Gift", type: "expense", icon: "gift", color: "#FF4081" },
    { name: "Gym", type: "expense", icon: "dumbbell", color: "#607D8B" },
    { name: "Hotel", type: "expense", icon: "bed", color: "#3F51B5" },
    { name: "Laundry", type: "expense", icon: "shirt", color: "#009688" },
    { name: "Bank", type: "expense", icon: "landmark", color: "#455A64" },
    { name: "Miscellaneous", type: "expense", icon: "more-horizontal", color: "#9E9E9E" },
    { name: "Telephone", type: "expense", icon: "phone", color: "#00ACC1" },
    { name: "Clothes", type: "expense", icon: "shirt", color: "#8D6E63" },
    { name: "Insurance", type: "expense", icon: "shield", color: "#546E7A" },
];

/**
 * Supported currencies for display (stored currency is always INR).
 */
export const SUPPORTED_CURRENCIES = [
    { code: "INR", symbol: "₹", name: "Indian Rupee" },
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
    { code: "JPY", symbol: "¥", name: "Japanese Yen" },
    { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
    { code: "AUD", symbol: "A$", name: "Australian Dollar" },
] as const;

/**
 * Forex cache TTL in milliseconds (24 hours).
 */
export const FOREX_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Maximum screenshots per upload batch.
 */
export const MAX_SCREENSHOTS_PER_BATCH = 5;

/**
 * OCR confidence threshold — below this, flag for review.
 */
export const OCR_CONFIDENCE_THRESHOLD = 0.5;
