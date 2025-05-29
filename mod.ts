// deno-lint-ignore-file no-explicit-any
export interface Issue {
  path: string[]
  error: string
}

class ValidationError extends Error {
  constructor(public issues: Issue[]) {
    super("Validation failed [" + issues.map(i => i.error).join(", ") + "]")
    this.name = "ValidationError"
  }
}

type Validator<T> = (value: T) => T
export type Infer<V> = V extends Validator<infer U> ? U : never

type V<T> = (value: T) => true | string
type Rule<T, A extends any[]> = (...args: A) => V<T>

type Builder<R extends Record<string, Rule<any, any[]>>, U> = Validator<U> & {
  [K in keyof R]: (...args: Parameters<R[K]>) => Builder<R, U>
} & { optional: () => Builder<R, U | undefined> }

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

function validator<R extends Record<string, Rule<any, any[]>>>(
  type: (value: any) => true | string,
  rules: R
): Builder<R, R[keyof R] extends Rule<infer U, any[]> ? U : never> {
  let optional = false
  const build = (checks: V<any>[]): any => {
    const fn = ((v: any, safe?: boolean) => {
      if (optional && v === undefined) return safe ? { ok: true, value: v } : v
      const typeResult = type(v);
      if (typeResult !== true) {
        if (safe) return { ok: false, issues: [{ path: [], error: typeResult as string }] }
        throw new ValidationError([{ path: [], error: typeResult as string }])
      }
      let errs: Issue[] | null = null
      for (let i = 0, len = checks.length; i < len; ++i) {
        const res = checks[i](v)
        if (res !== true) {
          if (!errs) errs = []
          errs.push({ path: [], error: res as string })
        }
      }
      if (errs) {
        if (safe) return { ok: false, issues: errs }
        throw new ValidationError(errs)
      }
      return safe ? { ok: true, value: v } : v
    }) as Builder<R, any>
    fn.optional = () => {
      optional = true
      return fn
    }
    const reserved = new Set(["length", "name", "prototype", "arguments"])
    for (const k in rules) {
      if (reserved.has(k)) continue
      (fn as any)[k] = (...args: any[]) => build([...checks, (rules as any)[k](...args)])
    }
    return fn
  }
  return build([])
}

function object<S extends Record<string, Validator<any>>>(
  schema: S
): Validator<InputOf<S>> & { optional: () => Validator<InputOf<S> | undefined> } {
  let optional = false
  const fn = ((x: any, safe?: boolean) => {
    if (optional && x === undefined) return safe ? { ok: true, value: x } : x
    if (typeof x !== 'object' || x === null || Array.isArray(x)) {
      if (safe) return { ok: false, issues: [{ path: [], error: "object.invalid_type" }] }
      throw new ValidationError([{ path: [], error: "object.invalid_type" }])
    }
    const issues: Issue[] = []
    for (const key in schema) {
      const result = (schema[key] as any)(x[key], true)
      if (!result.ok) {
        for (const i of result.issues) {
          issues.push({ path: [String(key), ...i.path], error: i.error })
        }
      }
    }
    if (issues.length) {
      if (safe) return { ok: false, issues }
      throw new ValidationError(issues)
    }
    return safe ? { ok: true, value: x } : x
  }) as Validator<InputOf<S>> & { optional: () => Validator<InputOf<S> | undefined> }
  fn.optional = () => {
    optional = true
    return fn as Validator<InputOf<S> | undefined>
  }
  return fn
}

const array = <U = any>() => validator((a: U[]) => Array.isArray(a) ? true : 'array.invalid_type', {
  min: (len: number, e = 'array.min') => (a: U[]) => a.length >= len ? true : e,
  max: (len: number, e = 'array.max') => (a: U[]) => a.length <= len ? true : e,
  unique: (e = 'array.unique') => (a: U[]) => new Set(a).size === a.length ? true : e,
  items: (itemValidator: Validator<U>) => (a: U[]) => {
    const issues: Issue[] = [];
    for (let i = 0; i < a.length; i++) {
      const result = (itemValidator as any)(a[i], true);
      if (!result.ok) {
        for (const issue of result.issues) {
          issues.push({ path: [String(i), ...issue.path], error: issue.error });
        }
      }
    }
    if (issues.length) throw new ValidationError(issues);
    return true;
  }
})

const union = <T extends Validator<any>[]>(...validators: T) => {
  let optional = false;
  const fn = ((value: any, safe?: boolean) => {
    if (optional && value === undefined) return safe ? { ok: true, value } : value;
    for (const validator of validators) {
      const result = (validator as any)(value, true);
      if (result && result.ok) return safe ? result : result.value;
    }
    if (safe) return { ok: false, issues: [{ path: [], error: "union.invalid_type" }] };
    throw new ValidationError([{ path: [], error: "union.invalid_type" }]);
  }) as Validator<Infer<T[number]>> & { optional: () => Validator<Infer<T[number]> | undefined> };
  fn.optional = () => {
    optional = true;
    return fn as Validator<Infer<T[number]> | undefined>;
  };
  return fn;
}

const literal = <T>(value: T, error = "literal.invalid_value"): Validator<T> & { optional: () => Validator<T | undefined> } => {
  let optional = false;
  const fn = ((x: any, safe?: boolean) => {
    if (optional && x === undefined) return safe ? { ok: true, value: x } : x;
    if (x === value) return safe ? { ok: true, value: x } : x;
    if (safe) return { ok: false, issues: [{ path: [], error }] };
    throw new ValidationError([{ path: [], error }]);
  }) as Validator<T> & { optional: () => Validator<T | undefined> };
  fn.optional = () => {
    optional = true;
    return fn as Validator<T | undefined>;
  };
  return fn;
}

const enumeration = <T extends string | number>(...values: T[]): Validator<T> & { optional: () => Validator<T | undefined> } => {
  const set = new Set(values)
  let optional = false
  const fn = ((x: any, safe?: boolean) => {
    if (optional && x === undefined) return safe ? { ok: true, value: x } : x
    if (set.has(x)) return safe ? { ok: true, value: x } : x
    if (safe) return { ok: false, issues: [{ path: [], error: "enum.invalid_value" }] }
    throw new ValidationError([{ path: [], error: "enum.invalid_value" }])
  }) as Validator<T> & { optional: () => Validator<T | undefined> }
  fn.optional = () => {
    optional = true
    return fn as Validator<T | undefined>
  }
  return fn
}

const boolean = (): Validator<boolean> & { optional: () => Validator<boolean | undefined> } => {
  let optional = false;
  const fn = ((x: any, safe?: boolean) => {
    if (optional && x === undefined) return safe ? { ok: true, value: x } : x;
    if (typeof x === 'boolean') return safe ? { ok: true, value: x } : x;
    if (safe) return { ok: false, issues: [{ path: [], error: "boolean.invalid_type" }] };
    throw new ValidationError([{ path: [], error: "boolean.invalid_type" }]);
  }) as Validator<boolean> & { optional: () => Validator<boolean | undefined> };
  fn.optional = () => {
    optional = true;
    return fn as Validator<boolean | undefined>;
  };
  return fn;
}

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
  email: (e = 'string.invalid_email') => (s: string) => /^(?!\.)(?!.*\.\.)([a-z0-9_'+\-\.]*)[a-z0-9_+-]@([a-z0-9][a-z0-9\-]*\.)+[a-z]{2,}$/i.test(s) ? true : e,
})

const date = () => validator((d: Date) => d instanceof Date && !isNaN(d.getTime()) ? true : 'date.invalid_type', {
  min: (d: Date, e = 'date.min') => (x: Date) => x >= d ? true : e,
  max: (d: Date, e = 'date.max') => (x: Date) => x <= d ? true : e,
});

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

export const v = { string, number, bigint, boolean, date, array, union, literal, enum: enumeration, object }