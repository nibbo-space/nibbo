import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      field = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else if (c === "\r") {
      if (text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((x) => x !== "")) rows.push(row);
  return rows;
}

function setAtPath(root, template, parts, value) {
  if (parts.length === 0) return false;
  const head = parts[0];
  const isIdx = /^\d+$/.test(head);
  if (parts.length === 1) {
    if (isIdx) {
      const i = Number(head);
      if (!Array.isArray(root) || !Array.isArray(template) || i < 0 || i >= template.length) return false;
      root[i] = value;
      return true;
    }
    if (!Object.prototype.hasOwnProperty.call(template, head)) return false;
    root[head] = value;
    return true;
  }
  if (isIdx) {
    const i = Number(head);
    if (!Array.isArray(root) || !Array.isArray(template) || i < 0 || i >= template.length) return false;
    return setAtPath(root[i], template[i], parts.slice(1), value);
  }
  if (!Object.prototype.hasOwnProperty.call(template, head)) return false;
  return setAtPath(root[head], template[head], parts.slice(1), value);
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("usage: node scripts/merge-ja-from-csv.mjs <path-to.csv>");
  process.exit(1);
}

const enPath = path.join(__dirname, "../src/lib/locales/en.json");
const jaPath = path.join(__dirname, "../src/lib/locales/ja.json");
const csvText = fs.readFileSync(csvPath, "utf8");
const rows = parseCsv(csvText);
const header = rows[0];
const idxKey = header.indexOf("key");
const idxJa = header.indexOf("ja");
if (idxKey < 0 || idxJa < 0) throw new Error("CSV must have key and ja columns");

const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const out = structuredClone(en);

let applied = 0;
let skippedEmpty = 0;
let skippedPath = 0;
for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  if (row.length <= Math.max(idxKey, idxJa)) continue;
  const key = row[idxKey]?.trim();
  let ja = row[idxJa] ?? "";
  if (!key) continue;
  if (!String(ja).trim()) {
    skippedEmpty++;
    continue;
  }
  const parts = key.split(".");
  if (!setAtPath(out, en, parts, ja)) {
    console.warn("unknown path:", key);
    skippedPath++;
  } else {
    applied++;
  }
}

fs.writeFileSync(jaPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ applied, skippedEmpty, skippedPath, jaPath }, null, 2));
