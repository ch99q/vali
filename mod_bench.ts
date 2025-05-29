import { v } from "./mod.ts";

import { z } from "npm:zod@3.25.36/v4";
import { z as zm } from "npm:zod@3.25.36/v4-mini";

Deno.bench({
  name: "zod v4",
  group: "array() - 10k",
  fn: () => {
    const schema = z.array(z.string());
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) {
          schema.parse(["a", "b", "c"]); // valid
        } else {
          schema.parse(["a", "b", "c", 1]); // invalid
        }
      } catch {
        // ignore validation errors
      }
    }
  }
})

Deno.bench({
  name: "zod v4-mini",
  group: "array() - 10k",
  fn: () => {
    const schema = zm.array(zm.string());
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) {
          schema.parse(["a", "b", "c"]); // valid
        } else {
          schema.parse(["a", "b", "c", 1]); // invalid
        }
      } catch {
        // ignore validation errors
      }
    }
  }
})

Deno.bench({
  name: "vali",
  group: "array() - 10k",
  fn: () => {
    const schema = v.array().items(v.string());
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) {
          schema(["a", "b", "c"]); // valid
        } else {
          schema(["a", "b", "c", 1]); // invalid
        }
      } catch {
        // ignore validation errors
      }
    }
  }
})

// --- .min(3) ---
Deno.bench({
  name: "zod v4",
  group: "array().min(3) - 10k",
  fn: () => {
    const schema = z.array(z.string()).min(3);
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) {
          schema.parse(["a", "b", "c"]); // valid
        } else {
          schema.parse(["a", "b"]); // invalid
        }
      } catch {
        // ignore validation errors
      }
    }
  }
});

Deno.bench({
  name: "zod v4-mini",
  group: "array().min(3) - 10k",
  fn: () => {
    const schema = zm.array(z.string()).check(zm.minLength(3))
    for (let i = 0; i < 10_000; i++) {
      try {
        const arr = i % 2 === 0 ? ["a", "b", "c"] : ["a", "b"];
        schema.parse(arr);
        if (arr.length < 3) throw new Error("array.min");
      } catch {
        // ignore validation errors
      }
    }
  }
});

Deno.bench({
  name: "vali",
  group: "array().min(3) - 10k",
  fn: () => {
    const schema = v.array().items(v.string()).min(3);
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) {
          schema(["a", "b", "c"]);
        } else {
          schema(["a", "b"]);
        }
      } catch {
        // ignore validation errors
      }
    }
  }
});

// --- .max(3) ---
Deno.bench({
  name: "zod v4",
  group: "array().max(3) - 10k",
  fn: () => {
    const schema = z.array(z.string()).max(3);
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) {
          schema.parse(["a", "b", "c"]);
        } else {
          schema.parse(["a", "b", "c", "d"]);
        }
      } catch {
        // ignore validation errors
      }
    }
  }
});

Deno.bench({
  name: "zod v4-mini",
  group: "array().max(3) - 10k",
  fn: () => {
    const schema = zm.array(zm.string()).check(zm.maxLength(3))
    for (let i = 0; i < 10_000; i++) {
      try {
        const arr = i % 2 === 0 ? ["a", "b", "c"] : ["a", "b", "c", "d"];
        schema.parse(arr);
        if (arr.length > 3) throw new Error("array.max");
      } catch {
        // ignore validation errors
      }
    }
  }
});

Deno.bench({
  name: "vali",
  group: "array().max(3) - 10k",
  fn: () => {
    const schema = v.array().items(v.string()).max(3);
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) {
          schema(["a", "b", "c"]);
        } else {
          schema(["a", "b", "c", "d"]);
        }
      } catch {
        // ignore validation errors
      }
    }
  }
});

// --- .unique() ---
Deno.bench({
  name: "zod v4",
  group: "array().unique() - 10k",
  fn: () => {
    const schema = z.array(z.string()).check(zm.refine(
      (arr) => new Set(arr).size === arr.length,
      { message: "array.unique" }
    ))
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) {
          schema.parse(["a", "b", "c"]); // valid
        } else {
          schema.parse(["a", "b", "a"]); // invalid
        }
      } catch {
        // ignore validation errors
      }
    }
  }
});

Deno.bench({
  name: "zod v4-mini",
  group: "array().unique() - 10k",
  fn: () => {
    const schema = zm.array(zm.string()).check(zm.refine(
      (arr) => new Set(arr).size === arr.length,
      { message: "array.unique" }
    ))
    for (let i = 0; i < 10_000; i++) {
      try {
        const arr = i % 2 === 0 ? ["a", "b", "c"] : ["a", "b", "a"];
        schema.parse(arr);
        if (new Set(arr).size !== arr.length) throw new Error("array.unique");
      } catch {
        // ignore validation errors
      }
    }
  }
});

Deno.bench({
  name: "vali",
  group: "array().unique() - 10k",
  fn: () => {
    const schema = v.array().items(v.string()).unique();
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) {
          schema(["a", "b", "c"]);
        } else {
          schema(["a", "b", "a"]);
        }
      } catch {
        // ignore validation errors
      }
    }
  }
});

// --- object() ---
Deno.bench({
  name: "zod v4",
  group: "object() - 10k",
  fn: () => {
    const schema = z.object({ a: z.string(), b: z.number().optional() });
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) {
          schema.parse({ a: "foo", b: 1 });
        } else {
          schema.parse({ a: "foo", b: "bar" });
        }
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "object() - 10k",
  fn: () => {
    const schema = zm.object({ a: zm.string(), b: zm.number() });
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) {
          schema.parse({ a: "foo", b: 1 });
        } else {
          schema.parse({ a: "foo", b: "bar" });
        }
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "object() - 10k",
  fn: () => {
    const schema = v.object({ a: v.string(), b: v.number().optional() });
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) {
          schema({ a: "foo", b: 1 });
        } else {
          schema({ a: "foo", b: "bar" } as any);
        }
      } catch {}
    }
  }
});

// --- union() ---
Deno.bench({
  name: "zod v4",
  group: "union() - 10k",
  fn: () => {
    const schema = z.union([z.string(), z.number()]);
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("foo");
        else schema.parse(true);
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "union() - 10k",
  fn: () => {
    const schema = zm.union([zm.string(), zm.number()]);
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("foo");
        else schema.parse(true);
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "union() - 10k",
  fn: () => {
    const schema = v.union(v.string(), v.number());
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema("foo");
        else schema(true as any);
      } catch {}
    }
  }
});

// --- literal() ---
Deno.bench({
  name: "zod v4",
  group: "literal() - 10k",
  fn: () => {
    const schema = z.literal("foo");
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("foo");
        else schema.parse("bar");
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "literal() - 10k",
  fn: () => {
    const schema = zm.literal("foo");
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("foo");
        else schema.parse("bar");
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "literal() - 10k",
  fn: () => {
    const schema = v.literal("foo");
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema("foo");
        else schema("bar");
      } catch {}
    }
  }
});

// --- enum() ---
Deno.bench({
  name: "zod v4",
  group: "enum() - 10k",
  fn: () => {
    const schema = z.enum(["foo", "bar"]);
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("foo");
        else schema.parse("baz");
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "enum() - 10k",
  fn: () => {
    const schema = zm.enum(["foo", "bar"]);
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("foo");
        else schema.parse("baz");
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "enum() - 10k",
  fn: () => {
    const schema = v.enum("foo", "bar");
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema("foo");
        else schema("baz" as any);
      } catch {}
    }
  }
});

// --- string() subfunctions ---
Deno.bench({
  name: "zod v4",
  group: "string().min(3) - 10k",
  fn: () => {
    const schema = z.string().min(3);
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("foo");
        else schema.parse("fo");
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "string().min(3) - 10k",
  fn: () => {
    const schema = zm.string().check(zm.minLength(3));
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("foo");
        else schema.parse("fo");
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "string().min(3) - 10k",
  fn: () => {
    const schema = v.string().min(3);
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema("foo");
        else schema("fo");
      } catch {}
    }
  }
});

Deno.bench({
  name: "zod v4",
  group: "string().max(3) - 10k",
  fn: () => {
    const schema = z.string().max(3);
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("foo");
        else schema.parse("fooo");
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "string().max(3) - 10k",
  fn: () => {
    const schema = zm.string().check(zm.maxLength(3));
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("foo");
        else schema.parse("fooo");
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "string().max(3) - 10k",
  fn: () => {
    const schema = v.string().max(3);
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema("foo");
        else schema("fooo");
      } catch {}
    }
  }
});

Deno.bench({
  name: "zod v4",
  group: "string().regex() - 10k",
  fn: () => {
    const schema = z.string().regex(/^foo/);
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("foobar");
        else schema.parse("barfoo");
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "string().regex() - 10k",
  fn: () => {
    const schema = zm.string().check(zm.regex(/^foo/));
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("foobar");
        else schema.parse("barfoo");
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "string().regex() - 10k",
  fn: () => {
    const schema = v.string().regex(/^foo/);
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema("foobar");
        else schema("barfoo");
      } catch {}
    }
  }
});

// --- string() .startsWith() ---
Deno.bench({
  name: "zod v4",
  group: "string().startsWith() - 10k",
  fn: () => {
    const schema = z.string().startsWith("foo");
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("foobar");
        else schema.parse("barfoo");
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "string().startsWith() - 10k",
  fn: () => {
    const schema = zm.string().check(zm.startsWith("foo"));
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("foobar");
        else schema.parse("barfoo");
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "string().startsWith() - 10k",
  fn: () => {
    const schema = v.string().startsWith("foo");
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema("foobar");
        else schema("barfoo");
      } catch {}
    }
  }
});

// --- string() .endsWith() ---
Deno.bench({
  name: "zod v4",
  group: "string().endsWith() - 10k",
  fn: () => {
    const schema = z.string().endsWith("bar");
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("foobar");
        else schema.parse("barfoo");
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "string().endsWith() - 10k",
  fn: () => {
    const schema = zm.string().check(zm.endsWith("bar"));
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("foobar");
        else schema.parse("barfoo");
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "string().endsWith() - 10k",
  fn: () => {
    const schema = v.string().endsWith("bar");
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema("foobar");
        else schema("barfoo");
      } catch {}
    }
  }
});

// --- string() .includes() ---
Deno.bench({
  name: "zod v4",
  group: "string().includes() - 10k",
  fn: () => {
    const schema = z.string().includes("oo");
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("foobar");
        else schema.parse("barfoo");
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "string().includes() - 10k",
  fn: () => {
    const schema = zm.string().check(zm.includes("oo"));
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("foobar");
        else schema.parse("barfoo");
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "string().includes() - 10k",
  fn: () => {
    const schema = v.string().includes("oo");
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema("foobar");
        else schema("barfoo");
      } catch {}
    }
  }
});

// --- string() .uppercase() ---
Deno.bench({
  name: "zod v4",
  group: "string().uppercase() - 10k",
  fn: () => {
    const schema = z.string().uppercase();
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("foo");
        else schema.parse("FOO");
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "string().uppercase() - 10k",
  fn: () => {
    const schema = zm.string().check(zm.uppercase());
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("foo");
        else schema.parse("FOO");
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "string().uppercase() - 10k",
  fn: () => {
    const schema = v.string().uppercase();
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema("foo");
        else schema("FOO");
      } catch {}
    }
  }
});

// --- string() .lowercase() ---
Deno.bench({
  name: "zod v4",
  group: "string().lowercase() - 10k",
  fn: () => {
    const schema = z.string().lowercase();
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("FOO");
        else schema.parse("foo");
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "string().lowercase() - 10k",
  fn: () => {
    const schema = zm.string().check(zm.lowercase());
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("FOO");
        else schema.parse("foo");
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "string().lowercase() - 10k",
  fn: () => {
    const schema = v.string().lowercase();
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema("FOO");
        else schema("foo");
      } catch {}
    }
  }
});

// --- string() .email() ---
Deno.bench({
  name: "zod v4",
  group: "string().email() - 10k",
  fn: () => {
    const schema = z.email();
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("test@example.com");
        else schema.parse("invalid-email");
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "string().email() - 10k",
  fn: () => {
    const schema = zm.email();
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("test@example.com");
        else schema.parse("invalid-email");
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "string().email() - 10k",
  fn: () => {
    const schema = v.string().email();
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema("test@example.com");
        else schema("invalid-email");
      } catch {}
    }
  }
});

// --- string() .len() ---
Deno.bench({
  name: "zod v4",
  group: "string().len() - 10k",
  fn: () => {
    const schema = z.string().length(3);
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("foo");
        else schema.parse("foobar");
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "string().len() - 10k",
  fn: () => {
    const schema = zm.string().check(zm.length(3));
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse("foo");
        else schema.parse("foobar");
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "string().len() - 10k",
  fn: () => {
    const schema = v.string().len(3);
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema("foo");
        else schema("foobar");
      } catch {}
    }
  }
});

// --- number() subfunctions ---
Deno.bench({
  name: "zod v4",
  group: "number().min(3) - 10k",
  fn: () => {
    const schema = z.number().min(3);
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse(3);
        else schema.parse(2);
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "number().min(3) - 10k",
  fn: () => {
    const schema = zm.number().check(zm.minimum(3));
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse(3);
        else schema.parse(2);
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "number().min(3) - 10k",
  fn: () => {
    const schema = v.number().min(3);
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema(3);
        else schema(2);
      } catch {}
    }
  }
});

Deno.bench({
  name: "zod v4",
  group: "number().max(3) - 10k",
  fn: () => {
    const schema = z.number().max(3);
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse(3);
        else schema.parse(4);
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "number().max(3) - 10k",
  fn: () => {
    const schema = zm.number().check(zm.maximum(3));
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse(3);
        else schema.parse(4);
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "number().max(3) - 10k",
  fn: () => {
    const schema = v.number().max(3);
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema(3);
        else schema(4);
      } catch {}
    }
  }
});

Deno.bench({
  name: "zod v4",
  group: "number().positive() - 10k",
  fn: () => {
    const schema = z.number().positive();
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse(3);
        else schema.parse(-3);
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "number().positive() - 10k",
  fn: () => {
    const schema = zm.number().check(zm.positive());
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse(3);
        else schema.parse(-3);
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "number().positive() - 10k",
  fn: () => {
    const schema = v.number().positive();
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema(3);
        else schema(-3);
      } catch {}
    }
  }
});

Deno.bench({
  name: "zod v4",
  group: "number().negative() - 10k",
  fn: () => {
    const schema = z.number().negative();
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse(-3);
        else schema.parse(3);
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "number().negative() - 10k",
  fn: () => {
    const schema = zm.number().check(zm.negative());
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse(-3);
        else schema.parse(3);
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "number().negative() - 10k",
  fn: () => {
    const schema = v.number().negative();
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema(-3);
        else schema(3);
      } catch {}
    }
  }
});

// --- bigint() subfunctions ---
Deno.bench({
  name: "zod v4",
  group: "bigint().min(3n) - 10k",
  fn: () => {
    const schema = z.bigint().min(3n);
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse(3n);
        else schema.parse(2n);
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "bigint().min(3n) - 10k",
  fn: () => {
    const schema = zm.bigint().check(zm.minimum(3n));
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse(3n);
        else schema.parse(2n);
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "bigint().min(3n) - 10k",
  fn: () => {
    const schema = v.bigint().min(3n);
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema(3n);
        else schema(2n);
      } catch {}
    }
  }
});

Deno.bench({
  name: "zod v4",
  group: "bigint().max(3n) - 10k",
  fn: () => {
    const schema = z.bigint().max(3n);
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse(3n);
        else schema.parse(4n);
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "bigint().max(3n) - 10k",
  fn: () => {
    const schema = zm.bigint().check(zm.maximum(3n));
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse(3n);
        else schema.parse(4n);
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "bigint().max(3n) - 10k",
  fn: () => {
    const schema = v.bigint().max(3n);
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema(3n);
        else schema(4n);
      } catch {}
    }
  }
});

Deno.bench({
  name: "zod v4",
  group: "bigint().positive() - 10k",
  fn: () => {
    const schema = z.bigint().positive();
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse(3n);
        else schema.parse(-3n);
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "bigint().positive() - 10k",
  fn: () => {
    const schema = zm.bigint().check(zm.positive());
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse(3n);
        else schema.parse(-3n);
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "bigint().positive() - 10k",
  fn: () => {
    const schema = v.bigint().positive();
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema(3n);
        else schema(-3n);
      } catch {}
    }
  }
});

Deno.bench({
  name: "zod v4",
  group: "bigint().negative() - 10k",
  fn: () => {
    const schema = z.bigint().negative();
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse(-3n);
        else schema.parse(3n);
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "bigint().negative() - 10k",
  fn: () => {
    const schema = zm.bigint().check(zm.negative());
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse(-3n);
        else schema.parse(3n);
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "bigint().negative() - 10k",
  fn: () => {
    const schema = v.bigint().negative();
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema(-3n);
        else schema(3n);
      } catch {}
    }
  }
});

// --- boolean() ---
Deno.bench({
  name: "zod v4",
  group: "boolean() - 10k",
  fn: () => {
    const schema = z.boolean();
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse(true);
        else schema.parse("false");
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "boolean() - 10k",
  fn: () => {
    const schema = zm.boolean();
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse(true);
        else schema.parse("false");
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "boolean() - 10k",
  fn: () => {
    const schema = v.boolean();
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema(true);
        else schema("false" as any);
      } catch {}
    }
  }
});

// --- date() subfunctions ---
Deno.bench({
  name: "zod v4",
  group: "date().min() - 10k",
  fn: () => {
    const schema = z.date().min(new Date(2023, 0, 1));
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse(new Date(2023, 0, 2));
        else schema.parse(new Date(2022, 11, 31));
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "date().min() - 10k",
  fn: () => {
    const schema = zm.date().check(zm.maximum(new Date(2023, 0, 1)));
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse(new Date(2023, 0, 2));
        else schema.parse(new Date(2022, 11, 31));
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "date().min() - 10k",
  fn: () => {
    const schema = v.date().min(new Date(2023, 0, 1));
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema(new Date(2023, 0, 2));
        else schema(new Date(2022, 11, 31));
      } catch {}
    }
  }
});

Deno.bench({
  name: "zod v4",
  group: "date().max() - 10k",
  fn: () => {
    const schema = z.date().max(new Date(2023, 11, 31));
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse(new Date(2023, 11, 30));
        else schema.parse(new Date(2024, 0, 1));
      } catch {}
    }
  }
});
Deno.bench({
  name: "zod v4-mini",
  group: "date().max() - 10k",
  fn: () => {
    const schema = zm.date().check(zm.maximum(new Date(2023, 11, 31)));
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema.parse(new Date(2023, 11, 30));
        else schema.parse(new Date(2024, 0, 1));
      } catch {}
    }
  }
});
Deno.bench({
  name: "vali",
  group: "date().max() - 10k",
  fn: () => {
    const schema = v.date().max(new Date(2023, 11, 31));
    for (let i = 0; i < 10_000; i++) {
      try {
        if (i % 2 === 0) schema(new Date(2023, 11, 30));
        else schema(new Date(2024, 0, 1));
      } catch {}
    }
  }
});
