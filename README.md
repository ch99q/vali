# vali

A super-fast, minimal, and type-safe validation library for JavaScript and TypeScript.

- 🚀 **Performance:** Outperforms Zod and other popular libraries in benchmarks. See [benchmarks](./BENCHMARK)
- 🪶 **Lightweight:** Zero dependencies, tiny API surface.
- 🦾 **Type Inference:** Full TypeScript support with static type inference.
- 🧩 **Composable:** Build complex schemas from simple primitives.
- 🛡️ **Safe:** No exceptions for internal validation, only at the top level.

## Installation

```sh
deno add jsr:@ch99q/vali
```

Or import directly:

```ts
import { v } from "jsr:@ch99q/vali";
```

## Quick Start

```ts
import { v } from "jsr:@ch99q/vali";

const userSchema = v.object({
  name: v.string().min(2),
  age: v.number().min(0),
  email: v.string().email(),
  tags: v.array().items(v.string()).optional(),
});

userSchema({
  name: "Alice",
  age: 30,
  email: "alice@example.com",
  tags: ["admin", "user"],
}); // returns the value if valid, or throws ValidationError
```

## API Overview

### Primitives
- `v.string()` — string validator
- `v.number()` — number validator
- `v.bigint()` — bigint validator
- `v.boolean()` — boolean validator
- `v.date()` — date validator

### Combinators
- `v.object({...})` — object schema
- `v.array()` — array schema
- `v.union(a, b, ...)` — union of validators
- `v.literal(value)` — exact value
- `v.enum(...values)` — enum of allowed values

### Methods
- `.optional()` — make value optional
- `.min(n)` / `.max(n)` — min/max for numbers, strings, arrays
- `.len(n)` — exact length
- `.regex(re)` — regex for strings
- `.items(validator)` — array item validator
- `.unique()` — array uniqueness
- `.email()` — email validation for strings

### Example: Nested Objects & Unions

```ts
const schema = v.object({
  id: v.union(v.string(), v.number()),
  profile: v.object({
    email: v.string().email(),
    age: v.number().min(18),
  }),
  status: v.enum("active", "inactive").optional(),
});

schema({
  id: 123,
  profile: { email: "a@b.com", age: 22 },
  status: "active",
});
```

## Error Handling

If validation fails, a `ValidationError` is thrown with a list of issues:

```ts
try {
  userSchema({ name: "", age: -1, email: "bad" });
} catch (e) {
  if (e instanceof v.ValidationError) {
    console.log(e.issues); // [{ path: ["name"], error: "string.min" }, ...]
  }
}
```

## Type Inference

All schemas infer their TypeScript types:

```ts
import type { Infer } from "jsr:@ch99q/vali";

const schema = v.object({ name: v.string(), age: v.number().optional() });
type User = Infer<typeof schema>; // { name: string; age?: number | undefined }
```

## License

MIT
