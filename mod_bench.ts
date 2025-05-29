import { v } from "./mod.ts";

import { z } from "npm:zod@3.25.36/v4";
import { z as zm } from "npm:zod@3.25.36/v4-mini";

Deno.bench({
  name: "ch99q/vali",
  group: "string validator (min, max, pattern)",
  fn() {
    const validator = v.string().min(3).max(10).regex(/^[a-z]+$/);
    for (let i = 0; i < 100_000; i++) {
      validator("hello");
    }
  },
});

Deno.bench({
  name: "zod",
  group: "string validator (min, max, pattern)",
  fn() {
    const validator = z.string().min(3).max(10).regex(/^[a-z]+$/);
    for (let i = 0; i < 100_000; i++) {
      validator.parse("hello");
    }
  },
});

Deno.bench({
  name: "zm",
  group: "string validator (min, max, pattern)",
  fn() {
    const validator = zm.string().check(
      zm.minLength(3),
      zm.maxLength(10),
      zm.regex(/^[a-z]+$/)
    );
    for (let i = 0; i < 100_000; i++) {
      validator.parse("hello");
    }
  },
});

Deno.bench({
  name: "ch99q/vali",
  group: "number validator (min, max, clamp)",
  fn() {
    const validator = v.number().min(5).max(10).clamp(5, 10);
    for (let i = 0; i < 100_000; i++) {
      validator(7);
    }
  },
});

Deno.bench({
  name: "zod",
  group: "number validator (min, max, clamp)",
  fn() {
    const validator = z.number().min(5).max(10).refine((x) => x >= 5 && x <= 10);
    for (let i = 0; i < 100_000; i++) {
      validator.parse(7);
    }
  },
});

Deno.bench({
  name: "zm",
  group: "number validator (min, max, clamp)",
  fn() {
    const validator = zm.number().check(
      zm.refine((val) => val >= 5 && val <= 10)
    );
    for (let i = 0; i < 100_000; i++) {
      validator.parse(7);
    }
  },
});

Deno.bench({
  name: "ch99q/vali",
  group: "object schema validator (flat)",
  fn() {
    const schema = v.object({
      name: v.string().min(3).max(10),
      age: v.number().min(18).max(65),
      test: v.number().clamp(0, 100),
    });
    for (let i = 0; i < 50_000; i++) {
      schema({ name: "Alice", age: 30, test: 10 });
    }
  },
});

Deno.bench({
  name: "zod",
  group: "object schema validator (flat)",
  fn() {
    const schema = z.object({
      name: z.string().min(3).max(10),
      age: z.number().min(18).max(65),
      test: z.number().min(0).max(100),
    });
    for (let i = 0; i < 50_000; i++) {
      schema.parse({ name: "Alice", age: 30, test: 10 });
    }
  },
});

Deno.bench({
  name: "zm",
  group: "object schema validator (flat)",
  fn() {
    const schema = zm.object({
      name: zm.string().check(zm.minLength(3), zm.maxLength(10)),
      age: zm.number().check(zm.minimum(18), zm.maximum(65)),
      test: zm.number().check(zm.minimum(0), zm.maximum(100)),
    });
    for (let i = 0; i < 50_000; i++) {
      schema.parse({ name: "Alice", age: 30, test: 10 });
    }
  },
});

Deno.bench({
  name: "ch99q/vali",
  group: "object schema validator (deep)",
  fn() {
    const schema = v.object({
      level1: v.object({
        level2: v.object({ value: v.string().min(1).max(10) }),
        arr: v.array().min(1).max(3),
        optionalField: v.string().min(5).optional(),
        single: v.enum("single", "double"),
      }),
    });
    for (let i = 0; i < 20_000; i++) {
      schema({
        level1: {
          level2: { value: "test" },
          arr: [1, 2],
          optionalField: "optional",
          single: "single",
        },
      });
    }
  },
});

Deno.bench({
  name: "zod",
  group: "object schema validator (deep)",
  fn() {
    const schema = z.object({
      level1: z.object({
        level2: z.object({ value: z.string().min(1).max(10) }),
        arr: z.array(z.any()).min(1).max(3),
        optionalField: z.string().min(5).optional(),
        single: z.enum(["single", "double"]),
      }),
    });
    for (let i = 0; i < 20_000; i++) {
      schema.parse({
        level1: {
          level2: { value: "test" },
          arr: [1, 2],
          optionalField: "optional",
          single: "single",
        },
      });
    }
  },
});

Deno.bench({
  name: "zm",
  group: "object schema validator (deep)",
  fn() {
    const schema = zm.object({
      level1: zm.object({
        level2: zm.object({ value: zm.string().check(zm.minLength(1), zm.maxLength(10)) }),
        arr: zm.array(zm.number()).check(zm.minLength(1), zm.maxLength(3)),
        // optionalField: zm.string().check(zm.minLength(5)).optional(), // zod-mini may not support .optional()
        single: zm.enum(["single", "double"]),
      }),
    });
    for (let i = 0; i < 20_000; i++) {
      schema.parse({
        level1: {
          level2: { value: "test" },
          arr: [1, 2],
          // optionalField: "optional",
          single: "single",
        },
      });
    }
  },
});

Deno.bench({
  name: "ch99q/vali",
  group: "array validator (min, max, unique)",
  fn() {
    const validator = v.array().min(2).max(5).unique();
    for (let i = 0; i < 50_000; i++) {
      validator([1, 2, 3]);
    }
  },
});

Deno.bench({
  name: "zod",
  group: "array validator (min, max, unique)",
  fn() {
    const validator = z
      .array(z.number())
      .min(2)
      .max(5)
      .refine((arr) => new Set(arr).size === arr.length);
    for (let i = 0; i < 50_000; i++) {
      validator.parse([1, 2, 3]);
    }
  },
});

Deno.bench({
  name: "zm",
  group: "array validator (min, max, unique)",
  fn() {
    const validator = zm.array(zm.number()).check(
      zm.minLength(2),
      zm.maxLength(5),
      zm.refine((arr) => new Set(arr).size === arr.length)
    );
    for (let i = 0; i < 50_000; i++) {
      validator.parse([1, 2, 3]);
    }
  },
});

Deno.bench({
  name: "ch99q/vali",
  group: "enumeration validator",
  fn() {
    const validator = v.enum("apple", "banana", "cherry");
    for (let i = 0; i < 100_000; i++) {
      validator("banana");
    }
  },
});

Deno.bench({
  name: "zod",
  group: "enumeration validator",
  fn() {
    const validator = z.enum(["apple", "banana", "cherry"]);
    for (let i = 0; i < 100_000; i++) {
      validator.parse("banana");
    }
  },
});

Deno.bench({
  name: "zm",
  group: "enumeration validator",
  fn() {
    const validator = zm.enum(["apple", "banana", "cherry"]);
    for (let i = 0; i < 100_000; i++) {
      validator.parse("banana");
    }
  },
});

Deno.bench({
  name: "ch99q/vali",
  group: "equals validator",
  fn() {
    const validator = v.equals(42);
    for (let i = 0; i < 100_000; i++) {
      validator(42);
    }
  },
});

Deno.bench({
  name: "zod",
  group: "equals validator",
  fn() {
    const validator = z.literal(42);
    for (let i = 0; i < 100_000; i++) {
      validator.parse(42);
    }
  },
});

Deno.bench({
  name: "zm",
  group: "equals validator",
  fn() {
    const validator = zm.literal(42);
    for (let i = 0; i < 100_000; i++) {
      validator.parse(42);
    }
  },
});
