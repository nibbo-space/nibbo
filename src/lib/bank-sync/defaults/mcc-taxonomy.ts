export type MccBucket =
  | "groceries"
  | "dining"
  | "transport"
  | "utilities"
  | "health"
  | "entertainment"
  | "shopping"
  | "travel"
  | "education"
  | "subscriptions";

export const MCC_BUCKET_NAMES: Record<MccBucket, string[]> = {
  groceries: ["groceries", "grocery", "food", "продукти", "їжа", "супермаркет", "食料品", "食費"],
  dining: ["dining", "dining out", "cafe", "restaurant", "ресторан", "кафе", "їжа поза домом", "外食"],
  transport: ["transport", "travel", "fuel", "gas", "taxi", "транспорт", "пальне", "таксі", "交通"],
  utilities: ["utilities", "bills", "комуналка", "комунальні", "рахунки", "光熱費", "公共料金"],
  health: ["health", "pharmacy", "medical", "здоровʼя", "здоров'я", "аптека", "медицина", "健康", "医療"],
  entertainment: ["entertainment", "fun", "розваги", "кіно", "娯楽"],
  shopping: ["shopping", "clothes", "покупки", "одяг", "ショッピング"],
  travel: ["travel", "hotels", "подорожі", "готель", "旅行"],
  education: ["education", "освіта", "школа", "教育"],
  subscriptions: ["subscriptions", "підписки", "subscription", "サブスク"],
};

const MCC_TO_BUCKET: Record<number, MccBucket> = {
  5411: "groceries",
  5412: "groceries",
  5422: "groceries",
  5441: "groceries",
  5451: "groceries",
  5462: "groceries",
  5499: "groceries",
  5812: "dining",
  5813: "dining",
  5814: "dining",
  4111: "transport",
  4121: "transport",
  4131: "transport",
  4789: "transport",
  5541: "transport",
  5542: "transport",
  7523: "transport",
  4900: "utilities",
  4814: "utilities",
  4816: "utilities",
  4899: "utilities",
  5912: "health",
  8011: "health",
  8021: "health",
  8062: "health",
  8099: "health",
  7832: "entertainment",
  7922: "entertainment",
  7991: "entertainment",
  7996: "entertainment",
  7999: "entertainment",
  5311: "shopping",
  5331: "shopping",
  5611: "shopping",
  5621: "shopping",
  5651: "shopping",
  5661: "shopping",
  5691: "shopping",
  5699: "shopping",
  5732: "shopping",
  5941: "shopping",
  5942: "shopping",
  5945: "shopping",
  5999: "shopping",
  3000: "travel",
  3001: "travel",
  4511: "travel",
  7011: "travel",
  8211: "education",
  8220: "education",
  8299: "education",
  5815: "subscriptions",
  5816: "subscriptions",
  5817: "subscriptions",
  5818: "subscriptions",
};

export function mccToBucket(mcc: number | null | undefined): MccBucket | null {
  if (mcc == null || !Number.isFinite(mcc)) return null;
  return MCC_TO_BUCKET[mcc] ?? null;
}
