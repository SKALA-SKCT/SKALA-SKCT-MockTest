export function calculate(source: string) {
  const tokens = source.match(/\d+(?:\.\d+)?|[()%+\-×÷]/g) ?? [];
  if (tokens.join("") !== source || tokens.length === 0) throw new Error("invalid");

  let index = 0;
  const expression = (): number => {
    let value = term();
    while (tokens[index] === "+" || tokens[index] === "-") {
      const operator = tokens[index++];
      const right = term();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };
  const term = (): number => {
    let value = factor();
    while (tokens[index] === "×" || tokens[index] === "÷") {
      const operator = tokens[index++];
      const right = factor();
      value = operator === "×" ? value * right : value / right;
    }
    return value;
  };
  const factor = (): number => {
    if (tokens[index] === "-") {
      index += 1;
      return -factor();
    }
    let value: number;
    if (tokens[index] === "(") {
      index += 1;
      value = expression();
      if (tokens[index++] !== ")") throw new Error("invalid");
    } else {
      value = Number(tokens[index++]);
      if (!Number.isFinite(value)) throw new Error("invalid");
    }
    while (tokens[index] === "%") {
      index += 1;
      value /= 100;
    }
    return value;
  };

  const result = expression();
  if (index !== tokens.length || !Number.isFinite(result)) throw new Error("invalid");
  return Math.round(result * 1e8) / 1e8;
}

export function appendCalculatorInput(current: string, value: string, justCalculated: boolean) {
  const isDigit = /^\d$/.test(value);
  if (current === "오류" || (justCalculated && (isDigit || value === "." || value === "("))) {
    return value === "." ? "0." : value;
  }
  if (isDigit && current === "0") return value;
  if (value === "." && /(?:^|[+\-×÷(])$/.test(current)) {
    return current + "0.";
  }
  if (
    value === "." &&
    current
      .split(/[+\-×÷()]/)
      .at(-1)
      ?.includes(".")
  )
    return current;
  if (/^[+\-×÷]$/.test(value) && /[+\-×÷]$/.test(current)) {
    return current.slice(0, -1) + value;
  }
  return current + value;
}
