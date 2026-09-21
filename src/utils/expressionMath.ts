export class ExpressionError extends Error {
  position: number;

  constructor(message: string, position: number) {
    super(message);
    this.name = 'ExpressionError';
    this.position = position;
  }
}

type TokenKind = 'number' | 'name' | 'symbol' | 'eof';

interface Token {
  kind: TokenKind;
  value: string;
  position: number;
}

type AstNode =
  | { kind: 'number'; value: number }
  | { kind: 'variable' }
  | { kind: 'unary'; op: '+' | '-'; value: AstNode }
  | { kind: 'binary'; op: '+' | '-' | '*' | '/' | '^'; left: AstNode; right: AstNode }
  | { kind: 'function'; name: keyof typeof FUNCTIONS; value: AstNode };

const FUNCTIONS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  log10: Math.log10,
  log2: Math.log2,
  floor: Math.floor,
  ceil: Math.ceil,
} as const;

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
};

export interface CompiledExpression {
  source: string;
  normalized: string;
  evaluate: (x: number) => number;
}

function normalizeExpression(source: string) {
  return source
    .trim()
    .replace(/−/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, 'pi')
    .replace(/√\s*\(/g, 'sqrt(')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3');
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    const rest = source.slice(index);
    const numberMatch = rest.match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
    if (numberMatch) {
      tokens.push({ kind: 'number', value: numberMatch[0], position: index });
      index += numberMatch[0].length;
      continue;
    }

    const nameMatch = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (nameMatch) {
      tokens.push({ kind: 'name', value: nameMatch[0].toLowerCase(), position: index });
      index += nameMatch[0].length;
      continue;
    }

    if ('+-*/^()'.includes(char)) {
      tokens.push({ kind: 'symbol', value: char, position: index });
      index += 1;
      continue;
    }

    throw new ExpressionError('Ký tự không được hỗ trợ: ' + char, index);
  }

  if (tokens.length > 512) {
    throw new ExpressionError('Biểu thức quá dài để phân tích an toàn.', source.length);
  }

  tokens.push({ kind: 'eof', value: '', position: source.length });
  return tokens;
}

class Parser {
  private readonly tokens: Token[];
  private index = 0;
  private depth = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): AstNode {
    const node = this.parseAddSubtract();
    const token = this.peek();
    if (token.kind !== 'eof') {
      throw new ExpressionError('Không hiểu phần biểu thức tại đây.', token.position);
    }
    return node;
  }

  private parseAddSubtract(): AstNode {
    let left = this.parseMultiplyDivide();

    while (this.matchSymbol('+') || this.matchSymbol('-')) {
      const op = this.previous().value as '+' | '-';
      const right = this.parseMultiplyDivide();
      left = { kind: 'binary', op, left, right };
    }

    return left;
  }

  private parseMultiplyDivide(): AstNode {
    let left = this.parseUnary();

    while (true) {
      if (this.matchSymbol('*') || this.matchSymbol('/')) {
        const op = this.previous().value as '*' | '/';
        const right = this.parseUnary();
        left = { kind: 'binary', op, left, right };
        continue;
      }

      if (this.startsImplicitProduct(this.peek())) {
        const right = this.parseUnary();
        left = { kind: 'binary', op: '*', left, right };
        continue;
      }

      break;
    }

    return left;
  }

  private parseUnary(): AstNode {
    if (this.matchSymbol('+') || this.matchSymbol('-')) {
      const op = this.previous().value as '+' | '-';
      return { kind: 'unary', op, value: this.parseUnary() };
    }

    return this.parsePower();
  }

  private parsePower(): AstNode {
    const left = this.parsePrimary();

    if (this.matchSymbol('^')) {
      return {
        kind: 'binary',
        op: '^',
        left,
        right: this.parseUnary(),
      };
    }

    return left;
  }

  private parsePrimary(): AstNode {
    const token = this.peek();

    if (token.kind === 'number') {
      this.index += 1;
      const value = Number(token.value);
      if (!Number.isFinite(value)) throw new ExpressionError('Số nằm ngoài phạm vi tính toán.', token.position);
      return { kind: 'number', value };
    }

    if (token.kind === 'name') {
      this.index += 1;
      const name = token.value;

      if (name === 'x') return { kind: 'variable' };
      if (name in CONSTANTS) return { kind: 'number', value: CONSTANTS[name] };

      if (name in FUNCTIONS) {
        if (!this.matchSymbol('(')) {
          throw new ExpressionError('Hàm ' + name + ' cần dấu ngoặc, ví dụ ' + name + '(x).', token.position);
        }
        this.enterDepth(token.position);
        const value = this.parseAddSubtract();
        this.expectSymbol(')');
        this.depth -= 1;
        return { kind: 'function', name: name as keyof typeof FUNCTIONS, value };
      }

      throw new ExpressionError('Tên không được hỗ trợ: ' + name, token.position);
    }

    if (this.matchSymbol('(')) {
      this.enterDepth(token.position);
      const value = this.parseAddSubtract();
      this.expectSymbol(')');
      this.depth -= 1;
      return value;
    }

    throw new ExpressionError('Thiếu số, x, hằng số hoặc ngoặc.', token.position);
  }

  private enterDepth(position: number) {
    this.depth += 1;
    if (this.depth > 64) throw new ExpressionError('Biểu thức lồng quá sâu.', position);
  }

  private startsImplicitProduct(token: Token) {
    return token.kind === 'number' || token.kind === 'name' || (token.kind === 'symbol' && token.value === '(');
  }

  private matchSymbol(symbol: string) {
    const token = this.peek();
    if (token.kind === 'symbol' && token.value === symbol) {
      this.index += 1;
      return true;
    }
    return false;
  }

  private expectSymbol(symbol: string) {
    if (!this.matchSymbol(symbol)) {
      throw new ExpressionError('Thiếu dấu ' + symbol + '.', this.peek().position);
    }
  }

  private peek() {
    return this.tokens[this.index];
  }

  private previous() {
    return this.tokens[this.index - 1];
  }
}

function evaluateNode(node: AstNode, x: number): number {
  switch (node.kind) {
    case 'number':
      return node.value;
    case 'variable':
      return x;
    case 'unary': {
      const value = evaluateNode(node.value, x);
      return node.op === '-' ? -value : value;
    }
    case 'binary': {
      const left = evaluateNode(node.left, x);
      const right = evaluateNode(node.right, x);
      switch (node.op) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': return left / right;
        case '^': return left ** right;
      }
    }
    case 'function':
      return FUNCTIONS[node.name](evaluateNode(node.value, x));
  }
}

export function compileExpression(source: string): CompiledExpression {
  if (typeof source !== 'string' || source.trim() === '') {
    throw new ExpressionError('Hãy nhập một biểu thức theo biến x.', 0);
  }
  if (source.length > 500) {
    throw new ExpressionError('Biểu thức tối đa 500 ký tự.', 500);
  }

  const normalized = normalizeExpression(source);
  const ast = new Parser(tokenize(normalized)).parse();

  return {
    source,
    normalized,
    evaluate(x: number) {
      if (!Number.isFinite(x)) return NaN;
      try {
        return evaluateNode(ast, x);
      } catch {
        return NaN;
      }
    },
  };
}

export function expressionErrorMessage(error: unknown) {
  if (error instanceof ExpressionError) {
    return error.message + ' (vị trí ' + (error.position + 1) + ')';
  }
  return 'Không thể phân tích biểu thức.';
}
