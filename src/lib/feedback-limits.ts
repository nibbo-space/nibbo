export const FEEDBACK_MAX_TITLE_LEN = 200;
export const FEEDBACK_MAX_DESC_LEN = 5000;
export const FEEDBACK_MAX_FILES = 3;
export const FEEDBACK_MAX_FILE_BYTES = 2 * 1024 * 1024;
export const FEEDBACK_ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"] as const;
export const FEEDBACK_HONEYPOT_NAME = "company_url";
export const FEEDBACK_RATE_WINDOW_MS = 60 * 60 * 1000;
export const FEEDBACK_RATE_MAX_PER_WINDOW = 8;
