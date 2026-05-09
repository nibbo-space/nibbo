export function evaluateSimpleAmountExpression(input: string): number | null {
  const compact = input.trim().replace(/\s+/g, "");
  if (!compact) return null;
  try {
    const p = new ExprParser(compact);
    const v = p.parseExpr();
    if (!p.atEnd()) return null;
    if (!Number.isFinite(v)) return null;
    return v;
  } catch {
    return null;
  }
}

export function formatAmountInputString(value: number, integerOnly: boolean): string {
  if (!Number.isFinite(value)) return "";
  if (integerOnly) return String(Math.round(value));
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

class ExprParser {
  private i = 0;

  constructor(private readonly s: string) {}

  atEnd(): boolean {
    return this.i >= this.s.length;
  }

  private peek(): string {
    return this.s[this.i] ?? "";
  }

  parseExpr(): number {
    let v = this.parseTerm();
    for (;;) {
      const c = this.peek();
      if (c === "+") {
        this.i++;
        v += this.parseTerm();
      } else if (c === "-") {
        this.i++;
        v -= this.parseTerm();
      } else {
        break;
      }
    }
    return v;
  }

  private parseTerm(): number {
    let v = this.parseFactor();
    for (;;) {
      const c = this.peek();
      if (c === "*") {
        this.i++;
        v *= this.parseFactor();
      } else if (c === "/") {
        this.i++;
        const d = this.parseFactor();
        if (d === 0) throw new Error("div0");
        v /= d;
      } else {
        break;
      }
    }
    return v;
  }

  private parseFactor(): number {
    if (this.peek() === "+") {
      this.i++;
      return this.parseFactor();
    }
    if (this.peek() === "-") {
      this.i++;
      return -this.parseFactor();
    }
    return this.parseNumber();
  }

  private parseNumber(): number {
    const rest = this.s.slice(this.i);
    const m = rest.match(/^(\d+(?:[.,]\d*)?|[.,]\d+)/);
    if (!m) throw new Error("num");
    this.i += m[0].length;
    const n = parseFloat(m[0].replace(",", "."));
    if (!Number.isFinite(n)) throw new Error("nan");
    return n;
  }
}
