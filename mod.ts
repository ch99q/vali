// deno-lint-ignore-file no-explicit-any
export interface Issue {
  path: string[]
  error: string
}

class ValidationError extends Error {
  constructor(public issues: Issue[]) {
    super("Validation failed")
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
  rules: R
): Builder<R, R[keyof R] extends Rule<infer U, any[]> ? U : never> {
  let optional = false
  const build = (checks: V<any>[]): any => {
    const fn = ((v: any) => {
      if (optional && v === undefined) return v
      let errs: Issue[] | null = null
      for (let i = 0, len = checks.length; i < len; ++i) {
        const res = checks[i](v)
        if (res !== true) {
          if (!errs) errs = []
          errs.push({ path: [], error: res as string })
        }
      }
      if (errs) throw new ValidationError(errs)
      return v
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
): Validator<InputOf<S>> {
  return x => {
    const issues: Issue[] = []
    for (const key in schema) {
      try {
        schema[key]((x as any)[key])
      } catch (err) {
        if (err instanceof ValidationError) {
          for (const i of err.issues) {
            issues.push({ path: [String(key), ...i.path], error: i.error })
          }
        } else {
          throw err
        }
      }
    }
    if (issues.length) throw new ValidationError(issues)
    return x
  }
}

const array = <T = any>() => validator({
  min: (len: number, e = 'array.min') => (a: T[]) => Array.isArray(a) && a.length >= len ? true : e,
  max: (len: number, e = 'array.max') => (a: T[]) => Array.isArray(a) && a.length <= len ? true : e,
  unique: (e = 'array.unique') => (a: T[]) => Array.isArray(a) && new Set(a).size === a.length ? true : e,
})

const string = () => validator({
  min: (len: number, e = 'string.min') => (s: string) => typeof s === 'string' && s.length >= len ? true : e,
  max: (len: number, e = 'string.max') => (s: string) => typeof s === 'string' && s.length <= len ? true : e,
  len: (len: number, e = 'string.length') => (s: string) => typeof s === 'string' && s.length === len ? true : e,
  regex: (re: RegExp, e = 'string.regex') => (s: string) => typeof s === 'string' && re.test(s) ? true : e,
  startsWith: (prefix: string, e = 'string.startsWith') => (s: string) => typeof s === 'string' && s.startsWith(prefix) ? true : e,
  endsWith: (suffix: string, e = 'string.endsWith') => (s: string) => typeof s === 'string' && s.endsWith(suffix) ? true : e,
  includes: (sub: string, e = 'string.includes') => (s: string) => typeof s === 'string' && s.includes(sub) ? true : e,
  uppercase: (e = 'string.uppercase') => (s: string) => typeof s === 'string' && s === s.toUpperCase() ? true : e,
  lowercase: (e = 'string.lowercase') => (s: string) => typeof s === 'string' && s === s.toLowerCase() ? true : e,
  email: (e = 'string.email') => (s: string) => typeof s === 'string' && /^(?!\.)(?!.*\.\.)([a-z0-9_'+\-\.]*)[a-z0-9_+-]@([a-z0-9][a-z0-9\-]*\.)+[a-z]{2,}$/i.test(s) ? true : e,
})

const date = () => validator({
  min: (d: Date, e = 'date.min') => (x: Date) => x instanceof Date && !isNaN(x.getTime()) && x >= d ? true : e,
  max: (d: Date, e = 'date.max') => (x: Date) => x instanceof Date && !isNaN(x.getTime()) && x <= d ? true : e,
});

const number = () => validator({
  min: (n: number, e = 'number.min') => (x: number) => typeof x === 'number' && x >= n ? true : e,
  max: (n: number, e = 'number.max') => (x: number) => typeof x === 'number' && x <= n ? true : e,
  gt: (n: number) => (x: number) => typeof x === 'number' && x >= n ? true : 'number.gt',
  gte: (n: number) => (x: number) => typeof x === 'number' && x > n ? true : 'number.gte',
  lt: (n: number) => (x: number) => typeof x === 'number' && x <= n ? true : 'number.lt',
  lte: (n: number) => (x: number) => typeof x === 'number' && x < n ? true : 'number.lte',
  positive: (e = 'number.positive') => (x: number) => typeof x === 'number' && x > 0 ? true : e,
  negative: (e = 'number.negative') => (x: number) => typeof x === 'number' && x < 0 ? true : e,
  step: (step: number, e = 'number.step') => (x: number) => typeof x === 'number' && x % step === 0 ? true : e,
  clamp: (mn: number, mx: number, e = 'number.clamp') => (x: number) => typeof x === 'number' && x >= mn && x <= mx ? true : e,
})

const bigint = () => validator({
  min: (n: bigint, e = 'bigint.min') => (x: bigint) => typeof x === 'bigint' && x >= n ? true : e,
  max: (n: bigint, e = 'bigint.max') => (x: bigint) => typeof x === 'bigint' && x <= n ? true : e,
  gt: (n: bigint) => (x: bigint) => typeof x === 'bigint' && x >= n ? true : 'bigint.gt',
  gte: (n: bigint) => (x: bigint) => typeof x === 'bigint' && x > n ? true : 'bigint.gte',
  lt: (n: bigint) => (x: bigint) => typeof x === 'bigint' && x <= n ? true : 'bigint.lt',
  lte: (n: bigint) => (x: bigint) => typeof x === 'bigint' && x < n ? true : 'bigint.lte',
  positive: (e = 'bigint.positive') => (x: bigint) => typeof x === 'bigint' && x > 0n ? true : e,
  negative: (e = 'bigint.negative') => (x: bigint) => typeof x === 'bigint' && x < 0n ? true : e,
  step: (step: bigint, e = 'bigint.step') => (x: bigint) => typeof x === 'bigint' && x % step === 0n ? true : e,
  clamp: (mn: bigint, mx: bigint, e = 'bigint.clamp') => (x: bigint) => typeof x === 'bigint' && x >= mn && x <= mx ? true : e,
})

const boolean = (): Validator<boolean> => {
  return (x: any) => {
    if (typeof x === 'boolean') return x;
    throw new ValidationError([{ path: [], error: "boolean" }]);
  }
}

const equals = <T>(value: T, error = "equals"): Validator<T> => {
  return (x: any) => {
    if (x === value) return x;
    throw new ValidationError([{ path: [], error }]);
  }
}

const enumeration = <T extends string | number>(...values: T[]): Validator<T> => {
  const set = new Set(values)
  return (x: any) => {
    if (set.has(x)) return x
    throw new ValidationError([{ path: [], error: "enum" }])
  }
}

export const v = { string, number, bigint, boolean, date, array, equals, enum: enumeration, object }