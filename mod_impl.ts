// deno-lint-ignore-file no-explicit-any

/**
 * Represents a validation issue for a specific path in the input.
 * @property path The path to the invalid value.
 * @property error The error message describing the issue.
 */
export interface Issue {
  path: string[];
  error: string;
  key: string;
}

/**
 * Error thrown when validation fails, containing all issues found.
 * @extends Error
 * @property issues The list of validation issues.
 */
export class ValidationError extends Error {
  issues: Issue[];
  constructor(issues: { path: string[]; error: string }[]) {
    super("Validation failed [" + issues.map(i => i.error).join(", ") + "]");
    this.name = "ValidationError";
    // Always add key to each issue
    this.issues = issues.map(issue => ({
      ...issue,
      key: `${issue.path.join('.')}@${issue.error}`
    }));
  }
}

/**
 * A function that validates a value of type T.
 * @template T The type to validate.
 * @param value The value to validate.
 * @returns The validated value, or throws on error.
 */
type Validator<T> = { check: (value: T) => T }

/**
 * Infers the type validated by a Validator.
 * @template V The validator type.
 */
type Infer<V> =
  V extends { [__valiUnion]: infer U } ? U :
  V extends { [__valiLiteral]: infer L } ? L :
  V extends Validator<infer U> ? U :
  never

type V<T> = (value: T) => true | string
type Rule<T, A extends any[]> = (...args: A) => V<T>

type Builder<R extends Record<string, Rule<any, any[]>>, U> = Validator<U> & {
  [K in keyof R]: (...args: Parameters<R[K]>) => Builder<R, U>
} & { optional: () => Builder<R, U | undefined>, path: (initialPath: string) => Builder<R, U> }

type OptionalKeys<S extends Record<string, Validator<any>>> = {
  [K in keyof S]: undefined extends Infer<S[K]> ? K : never
}[keyof S]

type RequiredKeys<S extends Record<string, Validator<any>>> = Exclude<
  keyof S,
  OptionalKeys<S>
>

type InputOf<S extends Record<string, Validator<any>>> =
  { [K in RequiredKeys<S>]: Infer<S[K]> } &
  { [K in OptionalKeys<S>]?: Exclude<Infer<S[K]>, undefined> }

/**
 * Creates a validator builder with custom rules.
 * @param type The base type check function.
 * @param rules The set of rules to apply.
 * @returns A builder for composing validators.
 */
function validator<R extends Record<string, Rule<any, any[]>>>(
  type: (value: any) => true | string,
  rules: R
): Builder<R, R[keyof R] extends Rule<infer U, any[]> ? U : never> {
  let optional = false
  const build = (checks: V<any>[]): any => {
    function fn(v: any, safe?: boolean) {
      if (optional && v === undefined) return safe ? { ok: true, value: v } : v
      const fn_path = (fn as any).$path;
      const typeCheck = type(v);
      if (typeCheck !== true) {
        if (safe) return { ok: false, issues: [{ path: [], error: typeCheck }] }
        throw new ValidationError([{ path: fn_path ? [fn_path] : [], error: typeCheck }])
      }
      let errs: Issue[] | null = null
      for (let i = 0, len = checks.length; i < len; ++i) {
        const res = checks[i](v)
        if (res !== true) {
          if (!errs) errs = []
          errs.push({ path: safe ? [] : fn_path ? [fn_path] : [], error: res as string } as any)
        }
      }
      if (errs) {
        if (safe) return { ok: false, issues: errs }
        throw new ValidationError(errs)
      }
      return safe ? { ok: true, value: v } : v
    }
    fn.check = fn;
    fn.optional = () => {
      optional = true
      return fn
    }
    fn.path = (initialPath: string) => {
      (fn as any).$path = initialPath;
      return fn;
    }
    for (const k in rules) {
      (fn as any)[k] = (...args: any[]) => build([...checks, (rules as any)[k](...args)])
    }
    return fn
  }
  return build([])
}

/**
 * Creates a validator for objects with a given schema.
 * @param schema The object schema.
 * @returns A validator for the object.
 */
function object<S extends Record<string, Validator<any>>>(
  schema: S
): Validator<InputOf<S>> & { optional: () => Validator<InputOf<S> | undefined>, path: (initialPath: string) => Validator<InputOf<S>> } {
  let optional = false
  function fn(x: any, safe?: boolean) {
    const fn_path = (fn as any).$path;
    if (optional && x === undefined) return safe ? { ok: true, value: x } : x
    if (typeof x !== 'object' || x === null || Array.isArray(x)) {
      if (safe) return { ok: false, issues: [{ path: [], error: "object.invalid_type" }] }
      throw new ValidationError([{ path: fn_path ? [fn_path] : [], error: "object.invalid_type" }])
    }
    const issues: Issue[] = []
    for (const key in schema) {
      const result = (schema[key] as any)(x[key], true)
      if (!result.ok) {
        for (const i of result.issues) {
          issues.push({ path: (!safe && fn_path) ? [fn_path, key, ...i.path] : [key, ...i.path], error: i.error, key } as Issue)
        }
      }
    }
    if (issues.length) {
      if (safe) return { ok: false, issues }
      throw new ValidationError(issues)
    }
    return safe ? { ok: true, value: x } : x
  }
  fn.check = fn;
  fn.optional = () => {
    optional = true
    return fn as Validator<InputOf<S> | undefined>
  }
  fn.path = (initialPath: string) => {
    (fn as any).$path = initialPath;
    return fn;
  }
  return fn as any;
}

/**
 * Creates a validator for arrays with optional rules and element validator.
 * @template U The array element type.
 * @param itemValidator The validator for array elements.
 * @returns A validator builder for arrays.
 * @example
 * array(string().min(3)).min(1).max(5)
 */
const array = <U>(type: Validator<U>) => validator(
  ((a: U[], safe: boolean) => {
    if (!Array.isArray(a)) return 'array.invalid_type';
    const issues: Issue[] = [];
    for (let i = 0; i < a.length; i++) {
      const result = (type as any)(a[i], true);
      if (!result.ok) {
        for (const issue of result.issues) {
          issues.push({ path: [(type as any).$path, String(i), ...issue.path].filter(Boolean), error: issue.error } as Issue);
        }
      }
    }
    if (issues.length > 0) {
      if (safe) return { ok: false, issues };
      throw new ValidationError(issues);
    }
    if (safe) return { ok: true, value: a };
    return true;
  }) as unknown as V<U[]>,
  {
    min: (len: number, e = 'array.min') => (a: U[]) => a.length >= len ? true : e,
    max: (len: number, e = 'array.max') => (a: U[]) => a.length <= len ? true : e,
    unique: (e = 'array.unique') => (a: U[]) => new Set(a).size === a.length ? true : e,
  }
)

/**
 * Creates a validator that accepts any of the provided validators.
 * @param validators The validators to try.
 * @returns A validator for the union type.
 */
const union = <T extends Validator<any>[]>(validators: T) => {
  let optional = false;
  function fn(value: any, safe?: boolean) {
    const fn_path = (fn as any).$path;
    if (optional && value === undefined) return safe ? { ok: true, value } : value;
    for (const validator of validators) {
      const result = (validator as any)(value, true);
      if (result && result.ok) return safe ? result : result.value;
    }
    if (safe) return { ok: false, issues: [{ path: [], error: "union.invalid_type" }] };
    throw new ValidationError([{ path: fn_path ? [fn_path] : [], error: "union.invalid_type" }]);
  }
  fn.check = fn;
  fn.optional = () => {
    optional = true;
    return fn as typeof fn & { [__valiUnion]: Infer<T[number]> | undefined };
  };
  fn.path = (initialPath: string) => {
    (fn as any).$path = initialPath;
    return fn;
  };
  // Attach the __valiUnion symbol for type inference
  (fn as any)[__valiUnion] = (undefined as unknown) as Infer<T[number]>;
  return fn as typeof fn & { [__valiUnion]: Infer<T[number]> };
}

/**
 * Creates a validator for a literal value.
 * @param value The literal value to match.
 * @param error The error message to use.
 * @returns A validator for the literal value.
 */
const literal = <const T>(value: T, error = "literal.invalid_value"): Validator<T> & { optional: () => Validator<T | undefined>, path: (initialPath: string) => Validator<T> } & { [__valiLiteral]: T } => {
  let optional = false;
  function fn(x: any, safe?: boolean) {
    const fn_path = (fn as any).$path;
    if (optional && x === undefined) return safe ? { ok: true, value: x } : x;
    if (x === value) return safe ? { ok: true, value: x } : x;
    if (safe) return { ok: false, issues: [{ path: [], error }] };
    throw new ValidationError([{ path: fn_path ? [fn_path] : [], error }]);
  }
  fn.check = fn;
  fn.optional = () => {
    optional = true;
    return fn as typeof fn & { [__valiLiteral]: T | undefined };
  };
  fn.path = (initialPath: string) => {
    (fn as any).$path = initialPath;
    return fn;
  };
  // Attach the __valiLiteral symbol for type inference
  (fn as any)[__valiLiteral] = value;
  return fn as typeof fn & { [__valiLiteral]: T };
}

/**
 * Creates a validator for an enum value.
 * @param values The allowed values.
 * @returns A validator for the enum.
 */
const enumeration = <T extends string | number>(...values: T[]): Validator<T> & { optional: () => Validator<T | undefined>, path: (initialPath: string) => Validator<T> } => {
  const set = new Set(values)
  let optional = false
  function fn(x: any, safe?: boolean) {
    const fn_path = (fn as any).$path;
    if (optional && x === undefined) return safe ? { ok: true, value: x } : x
    if (set.has(x)) return safe ? { ok: true, value: x } : x
    if (safe) return { ok: false, issues: [{ path: [], error: "enum.invalid_value" }] }
    throw new ValidationError([{ path: fn_path ? [fn_path] : [], error: "enum.invalid_value" }])
  }
  fn.check = fn;
  fn.optional = () => {
    optional = true
    return fn as Validator<T | undefined>
  }
  fn.path = (initialPath: string) => {
    (fn as any).$path = initialPath;
    return fn;
  }
  return fn as any;
}

const record = <K extends string, V>(type: Validator<V>) => {
  let optional = false;
  function fn(x: any, safe?: boolean) {
    if (optional && x === undefined) return safe ? { ok: true, value: x } : x;
    const fn_path = (fn as any).$path;
    if (typeof x !== 'object' || x === null || Array.isArray(x)) {
      if (safe) return { ok: false, issues: [{ path: [], error: "record.invalid_type" }] };
      throw new ValidationError([{ path: fn_path ? [fn_path] : [], error: "record.invalid_type" }]);
    }
    const issues: Issue[] = [];
    for (const key in x) {
      const valueResult = (type as any)(x[key], true);
      if (!valueResult.ok) {
        for (const issue of valueResult.issues) {
          issues.push({ path: [key, ...issue.path], error: issue.error } as Issue);
        }
      }
    }
    if (issues.length > 0) {
      if (safe) return { ok: false, issues };
      throw new ValidationError(issues);
    }
    return safe ? { ok: true, value: x } : x;
  }
  fn.check = fn;
  fn.optional = () => {
    optional = true;
    return fn as Validator<Record<K, V> | undefined>;
  }
  fn.path = (initialPath: string) => {
    (fn as any).$path = initialPath;
    return fn;
  }
  return fn as any;
}

/**
 * Creates a validator for boolean values.
 * @returns A validator for booleans.
 */
const boolean = (): Validator<boolean> & { optional: () => Validator<boolean | undefined>, path: (initialPath: string) => Validator<boolean> } => {
  let optional = false;
  function fn(x: any, safe?: boolean) {
    const fn_path = (fn as any).$path;
    if (optional && x === undefined) return safe ? { ok: true, value: x } : x;
    if (typeof x === 'boolean') return safe ? { ok: true, value: x } : x;
    if (safe) return { ok: false, issues: [{ path: [], error: "boolean.invalid_type" }] };
    throw new ValidationError([{ path: fn_path ? [fn_path] : [], error: "boolean.invalid_type" }]);
  }
  fn.check = fn;
  fn.optional = () => {
    optional = true;
    return fn as Validator<boolean | undefined>;
  };
  fn.path = (initialPath: string) => {
    (fn as any).$path = initialPath;
    return fn;
  };
  return fn as any;
}

/**
 * Creates a validator builder for strings with common string rules.
 * @returns A validator builder for strings.
 * @example
 * v.string().min(3).max(10).regex(/^[a-z]+$/)
 */
const string = () => validator((s: string) => typeof s === 'string' ? true : 'string.invalid_type', {
  min: (len: number, e = 'string.min') => (s: string) => s.length >= len ? true : e,
  max: (len: number, e = 'string.max') => (s: string) => s.length <= len ? true : e,
  len: (len: number, e = 'string.invalid_length') => (s: string) => s.length === len ? true : e,
  regex: (re: RegExp, e = 'string.invalid_regex') => (s: string) => re.test(s) ? true : e,
  startsWith: (prefix: string, e = 'string.starts_with') => (s: string) => s.startsWith(prefix) ? true : e,
  endsWith: (suffix: string, e = 'string.ends_with') => (s: string) => s.endsWith(suffix) ? true : e,
  includes: (sub: string, e = 'string.includes') => (s: string) => s.includes(sub) ? true : e,
  uppercase: (e = 'string.uppercase') => (s: string) => s === s.toUpperCase() ? true : e,
  lowercase: (e = 'string.lowercase') => (s: string) => s === s.toLowerCase() ? true : e,
})

/**
 * Creates a validator builder for Date objects.
 * @returns A validator builder for dates.
 */
const date = () => validator((d: Date) => d instanceof Date && !isNaN(d.getTime()) ? true : 'date.invalid_type', {
  min: (d: Date, e = 'date.min') => (x: Date) => x >= d ? true : e,
  max: (d: Date, e = 'date.max') => (x: Date) => x <= d ? true : e,
});

/**
 * Creates a validator builder for numbers with common numeric rules.
 * @returns A validator builder for numbers.
 * @example
 * v.number().min(0).max(100)
 */
const number = () => validator((n => typeof n === 'number' && !isNaN(n) ? true : 'number.invalid_type'), {
  min: (n: number, e = 'number.min') => (x: number) => x >= n ? true : e,
  max: (n: number, e = 'number.max') => (x: number) => x <= n ? true : e,
  gt: (n: number) => (x: number) => x > n ? true : 'number.gt',
  gte: (n: number) => (x: number) => x >= n ? true : 'number.gte',
  lt: (n: number) => (x: number) => x < n ? true : 'number.lt',
  lte: (n: number) => (x: number) => x <= n ? true : 'number.lte',
  positive: (e = 'number.positive') => (x: number) => x > 0 ? true : e,
  negative: (e = 'number.negative') => (x: number) => x < 0 ? true : e,
  step: (step: number, e = 'number.step') => (x: number) => x % step === 0 ? true : e,
  clamp: (mn: number, mx: number, e = 'number.clamp') => (x: number) => x >= mn && x <= mx ? true : e,
})

/**
 * Creates a validator builder for bigint values with common rules.
 * @returns A validator builder for bigints.
 */
const bigint = () => validator((n => typeof n === 'bigint' ? true : 'bigint.invalid_type'), {
  min: (n: bigint, e = 'bigint.min') => (x: bigint) => x >= n ? true : e,
  max: (n: bigint, e = 'bigint.max') => (x: bigint) => x <= n ? true : e,
  gt: (n: bigint) => (x: bigint) => x > n ? true : 'bigint.gt',
  gte: (n: bigint) => (x: bigint) => x >= n ? true : 'bigint.gte',
  lt: (n: bigint) => (x: bigint) => x < n ? true : 'bigint.lt',
  lte: (n: bigint) => (x: bigint) => x <= n ? true : 'bigint.lte',
  positive: (e = 'bigint.positive') => (x: bigint) => x > 0n ? true : e,
  negative: (e = 'bigint.negative') => (x: bigint) => x < 0n ? true : e,
  step: (step: bigint, e = 'bigint.step') => (x: bigint) => x % step === 0n ? true : e,
  clamp: (mn: bigint, mx: bigint, e = 'bigint.clamp') => (x: bigint) => x >= mn && x <= mx ? true : e,
})

/**
 * Collection of built-in validators and builders.
 */
export { string, number, bigint, boolean, date, array, union, record, literal, enumeration as enum, object }
export type { Infer as infer };

/**
 * Add unique symbols for union and literal type inference
 */
const __valiUnion = Symbol.for('__valiUnion');
const __valiLiteral = Symbol.for('__valiLiteral');

/**
 * Collection of aliases for built-in validators.
 */
export const email = () => string().regex(
  /^(?!\.)(?!.*\.\.)([a-z0-9_'+\-\.]*)[a-z0-9_+-]@([a-z0-9][a-z0-9\-]*\.)+[a-z]{2,}$/i,
  'string.invalid_email'
);
export const url = () => string().regex(/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/, 'string.invalid_url');
export const uuid = () => string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  'string.invalid_uuid'
);
export const hex = () => string().regex(/^[0-9a-f]+$/i, 'string.invalid_hex');
export const ip = () => string().regex(
  /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  'string.invalid_ip'
);
export const mac = () => string().regex(
  /^([0-9a-f]{2}[:-]){5}([0-9a-f]{2})$/i,
  'string.invalid_mac'
);
export const base64 = () => string().regex(
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
  'string.invalid_base64'
);

/**
 * Collection of built-in validators for common queries.
 */
export const find = () => literal<boolean>(true, 'query.not_found');
