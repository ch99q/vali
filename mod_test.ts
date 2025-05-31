// deno-lint-ignore-file no-explicit-any
import { v } from "./mod.ts";
import { assertEquals } from "jsr:@std/assert@^1.0.0";

const assertThrows = (fn: () => void, issues: v.Issue[]) => {
  try {
    fn();
    throw new Error("Expected function to throw");
  } catch (error) {
    if (error instanceof Error && error.name === "ValidationError") {
      // Use type assertion to access 'issues'
      assertEquals((error as any).issues as v.Issue[], issues);
    } else {
      throw error;
    }
  }
};

Deno.test("<type>.path()", () => {
  const strSchema = v.string().max(5).path("first_name");

  assertThrows(() => strSchema.check("Hello world"), [{ error: "string.max", path: ["first_name"] }])

  const objSchema = v.object({
    lv1: v.object({
      first_name: v.string().max(5).path("some_name")
    }).path("override_lv1"),
    arr: v.object({
      type: v.array(v.string()).min(1).path("things")
    })
  }).path("root");

  assertThrows(() => objSchema.check({ lv1: { first_name: "Hello world" }, arr: { type: [] } }), [
    { error: "string.max", path: ["root", "override_lv1", "some_name"] },
    { error: "array.min", path: ["root", "arr", "things"] }
  ])

})

Deno.test("v.array()", () => {
  const schema = v.array(v.number());

  assertEquals(schema.check([1, 2, 3]), [1, 2, 3]);
  assertEquals(schema.check([]), []);
  assertThrows(() => schema.check("not an array" as any), [{ path: [], error: "array.invalid_type" }]);
  assertThrows(() => schema.check(123 as any), [{ path: [], error: "array.invalid_type" }]);
  assertThrows(() => schema.check(true as any), [{ path: [], error: "array.invalid_type" }]);
  assertThrows(() => schema.check(null as any), [{ path: [], error: "array.invalid_type" }]);
  assertThrows(() => schema.check(undefined as any), [{ path: [], error: "array.invalid_type" }]);

  const optionalSchema = schema.optional();
  assertEquals(optionalSchema.check([1, 2, 3]), [1, 2, 3]);
  assertEquals(optionalSchema.check([]), []);
  assertEquals(optionalSchema.check(undefined), undefined);

  const minLengthSchema = schema.min(3);
  assertEquals(minLengthSchema.check([1, 2, 3]), [1, 2, 3]);
  assertThrows(() => minLengthSchema.check([1]), [{ path: [], error: "array.min" }]);

  const maxLengthSchema = schema.max(5);
  assertEquals(maxLengthSchema.check([1, 2]), [1, 2]);
  assertThrows(() => maxLengthSchema.check([1, 2, 3, 4, 5, 6]), [{ path: [], error: "array.max" }]);

  const uniqueSchema = schema.unique();
  assertEquals(uniqueSchema.check([1, 2, 3]), [1, 2, 3]);
  assertThrows(() => uniqueSchema.check([1, 2, 2]), [{ path: [], error: "array.unique" }]);

  const itemsUnionSchema = v.array(v.union([v.string(), v.number()]));
  assertEquals(itemsUnionSchema.check([1, "two", 3]), [1, "two", 3]);
  assertThrows(() => itemsUnionSchema.check([1, true as any, 3]), [{ path: ["1"], error: "union.invalid_type" }]);

  const itemsOptionalSchema = v.array(v.number().optional());
  assertEquals(itemsOptionalSchema.check([1, 2, 3]), [1, 2, 3]);
  assertEquals(itemsOptionalSchema.check([1, undefined, 3]), [1, undefined, 3]);
  assertThrows(() => itemsOptionalSchema.check([1, "not a number" as any]), [{ path: ["1"], error: "number.invalid_type" }]);
});

Deno.test("v.object()", () => {
  const schema = v.object({
    name: v.string(),
    age: v.number().optional(),
  });

  assertEquals(schema.check({ name: "Alice", age: 30 }), { name: "Alice", age: 30 });
  assertEquals(schema.check({ name: "Bob" }), { name: "Bob" });
  assertThrows(() => schema.check({ name: 123 as any }), [{ path: ["name"], error: "string.invalid_type" }]);
  assertThrows(() => schema.check({ name: "", age: "not a number" as any }), [{ path: ["age"], error: "number.invalid_type" }]);
  assertThrows(() => schema.check(null as any), [{ path: [], error: "object.invalid_type" }]);
  assertThrows(() => schema.check(undefined as any), [{ path: [], error: "object.invalid_type" }]);

  const deepSchema = v.object({
    user: v.object({
      id: v.string(),
      profile: v.object({
        email: v.string().email(),
        age: v.number().optional(),
      }),
    })
  });
  assertEquals(deepSchema.check({
    user: {
      id: "user123",
      profile: {
        email: "acme@acme.com",
        age: 25,
      }
    }
  }), {
    user: {
      id: "user123",
      profile: {
        email: "acme@acme.com",
        age: 25,
      }
    }
  });
  assertThrows(() => deepSchema.check({
    user: {
      id: "user123",
      profile: {
        email: "invalid-email",
        age: "not a number" as any,
      }
    }
  }), [
    { path: ["user", "profile", "email"], error: "string.invalid_email" },
    { path: ["user", "profile", "age"], error: "number.invalid_type" }
  ]);
  assertThrows(() => deepSchema.check(null as any), [{ path: [], error: "object.invalid_type" }]);
  assertThrows(() => deepSchema.check(undefined as any), [{ path: [], error: "object.invalid_type" }]);
  assertThrows(() => deepSchema.check({ user: null } as any), [{ path: ["user"], error: "object.invalid_type" }]);
  assertThrows(() => deepSchema.check({ user: { id: "user123", profile: null } } as any), [{ path: ["user", "profile"], error: "object.invalid_type" }]);

  const optionalDeepSchema = v.object({
    user: v.object({
      id: v.string(),
      profile: v.object({
        email: v.string().email(),
        age: v.number().optional(),
      }).optional(),
    })
  })

  assertEquals(optionalDeepSchema.check({
    user: {
      id: "user123",
      profile: {
        email: "acme@acme.com",
        age: 25,
      }
    }
  }), {
    user: {
      id: "user123",
      profile: {
        email: "acme@acme.com",
        age: 25,
      }
    }
  });
  assertEquals(optionalDeepSchema.check({
    user: {
      id: "user123",
      profile: undefined,
    }
  }), {
    user: {
      id: "user123",
      profile: undefined,
    }
  });
  assertThrows(() => optionalDeepSchema.check({
    user: {
      id: "user123",
      profile: {
        email: "invalid-email",
        age: "not a number" as any,
      }
    }
  }), [
    { path: ["user", "profile", "email"], error: "string.invalid_email" },
    { path: ["user", "profile", "age"], error: "number.invalid_type" }
  ]);
  assertThrows(() => optionalDeepSchema.check(null as any), [{ path: [], error: "object.invalid_type" }]);
});


Deno.test("v.union()", () => {
  const schema = v.union([v.string(), v.number()]);

  assertEquals(schema.check("hello"), "hello");
  assertEquals(schema.check(123), 123);
  assertThrows(() => schema.check(true as any), [{ path: [], error: "union.invalid_type" }]);
  assertThrows(() => schema.check(null as any), [{ path: [], error: "union.invalid_type" }]);
  assertThrows(() => schema.check(undefined as any), [{ path: [], error: "union.invalid_type" }]);

  const optionalSchema = schema.optional();
  assertEquals(optionalSchema.check("hello"), "hello");
  assertEquals(optionalSchema.check(123), 123);
  assertEquals(optionalSchema.check(undefined), undefined);

  const deepSchema = v.object({
    value: v.union([v.string(), v.number()]),
  });
  assertEquals(deepSchema.check({ value: "test" }), { value: "test" });
  assertEquals(deepSchema.check({ value: 42 }), { value: 42 });
  assertThrows(() => deepSchema.check({ value: true as any }), [{ path: ["value"], error: "union.invalid_type" }]);
});

Deno.test("v.literal()", () => {
  const schema = v.literal("test");

  assertEquals(schema.check("test"), "test");
  assertThrows(() => schema.check("not test" as any), [{ path: [], error: "literal.invalid_value" }]);
  assertThrows(() => schema.check(123 as any), [{ path: [], error: "literal.invalid_value" }]);
  assertThrows(() => schema.check(true as any), [{ path: [], error: "literal.invalid_value" }]);
  assertThrows(() => schema.check(null as any), [{ path: [], error: "literal.invalid_value" }]);
  assertThrows(() => schema.check(undefined as any), [{ path: [], error: "literal.invalid_value" }]);

  const optionalSchema = schema.optional();
  assertEquals(optionalSchema.check("test"), "test");
  assertEquals(optionalSchema.check(undefined), undefined);
});

Deno.test("v.enum()", () => {
  const schema = v.enum("apple", "banana", "cherry");

  assertEquals(schema.check("apple"), "apple");
  assertEquals(schema.check("banana"), "banana");
  assertEquals(schema.check("cherry"), "cherry");
  assertThrows(() => schema.check("orange" as any), [{ path: [], error: "enum.invalid_value" }]);
  assertThrows(() => schema.check(123 as any), [{ path: [], error: "enum.invalid_value" }]);
  assertThrows(() => schema.check(true as any), [{ path: [], error: "enum.invalid_value" }]);
  assertThrows(() => schema.check(null as any), [{ path: [], error: "enum.invalid_value" }]);
  assertThrows(() => schema.check(undefined as any), [{ path: [], error: "enum.invalid_value" }]);

  const optionalSchema = schema.optional();
  assertEquals(optionalSchema.check("apple"), "apple");
  assertEquals(optionalSchema.check(undefined), undefined);
});

Deno.test("v.string()", () => {
  const schema = v.string();

  assertEquals(schema.check("hello"), "hello");
  assertEquals(schema.check(""), "");
  assertThrows(() => schema.check(123 as any), [{ path: [], error: "string.invalid_type" }]);
  assertThrows(() => schema.check(true as any), [{ path: [], error: "string.invalid_type" }]);
  assertThrows(() => schema.check(null as any), [{ path: [], error: "string.invalid_type" }]);
  assertThrows(() => schema.check(undefined as any), [{ path: [], error: "string.invalid_type" }]);

  const optionalSchema = schema.optional();
  assertEquals(optionalSchema.check("hello"), "hello");
  assertEquals(optionalSchema.check(""), "");
  assertEquals(optionalSchema.check(undefined), undefined);

  const minLengthSchema = schema.min(3);
  assertEquals(minLengthSchema.check("hello"), "hello");
  assertThrows(() => minLengthSchema.check("hi"), [{ path: [], error: "string.min" }]);

  const maxLengthSchema = schema.max(5);
  assertEquals(maxLengthSchema.check("hi"), "hi");
  assertThrows(() => maxLengthSchema.check("hello world"), [{ path: [], error: "string.max" }]);

  const lengthSchema = schema.len(5);
  assertEquals(lengthSchema.check("hello"), "hello");
  assertThrows(() => lengthSchema.check("hi"), [{ path: [], error: "string.invalid_length" }]);

  const regexSchema = schema.regex(/^[a-z]+$/);
  assertEquals(regexSchema.check("hello"), "hello");
  assertThrows(() => regexSchema.check("Hello"), [{ path: [], error: "string.invalid_regex" }]);

  const startsWithSchema = schema.startsWith("he");
  assertEquals(startsWithSchema.check("hello"), "hello");
  assertThrows(() => startsWithSchema.check("world"), [{ path: [], error: "string.starts_with" }]);

  const endsWithSchema = schema.endsWith("lo");
  assertEquals(endsWithSchema.check("hello"), "hello");
  assertThrows(() => endsWithSchema.check("world"), [{ path: [], error: "string.ends_with" }]);

  const includesSchema = schema.includes("ll");
  assertEquals(includesSchema.check("hello"), "hello");
  assertThrows(() => includesSchema.check("world"), [{ path: [], error: "string.includes" }]);

  const uppercaseSchema = schema.uppercase();
  assertEquals(uppercaseSchema.check("HELLO"), "HELLO");
  assertThrows(() => uppercaseSchema.check("Hello"), [{ path: [], error: "string.uppercase" }]);

  const lowercaseSchema = schema.lowercase();
  assertEquals(lowercaseSchema.check("hello"), "hello");
  assertThrows(() => lowercaseSchema.check("Hello"), [{ path: [], error: "string.lowercase" }]);

  const emailSchema = schema.email();
  assertEquals(emailSchema.check("acme@acme.com"), "acme@acme.com");
  assertThrows(() => emailSchema.check("invalid-email"), [{ path: [], error: "string.invalid_email" }]);
});

Deno.test("v.number()", () => {
  const schema = v.number();

  assertEquals(schema.check(123), 123);
  assertEquals(schema.check(0), 0);
  assertThrows(() => schema.check("not a number" as any), [{ path: [], error: "number.invalid_type" }]);
  assertThrows(() => schema.check(true as any), [{ path: [], error: "number.invalid_type" }]);
  assertThrows(() => schema.check(null as any), [{ path: [], error: "number.invalid_type" }]);
  assertThrows(() => schema.check(undefined as any), [{ path: [], error: "number.invalid_type" }]);

  const optionalSchema = schema.optional();
  assertEquals(optionalSchema.check(123), 123);
  assertEquals(optionalSchema.check(0), 0);
  assertEquals(optionalSchema.check(undefined), undefined);

  const minSchema = schema.min(10);
  assertEquals(minSchema.check(10), 10);
  assertEquals(minSchema.check(20), 20);
  assertThrows(() => minSchema.check(5), [{ path: [], error: "number.min" }]);

  const maxSchema = schema.max(100);
  assertEquals(maxSchema.check(100), 100);
  assertEquals(maxSchema.check(50), 50);
  assertThrows(() => maxSchema.check(200), [{ path: [], error: "number.max" }]);

  const gtSchema = schema.gt(10);
  assertEquals(gtSchema.check(11), 11);
  assertThrows(() => gtSchema.check(10), [{ path: [], error: "number.gt" }]);

  const gteSchema = schema.gte(10);
  assertEquals(gteSchema.check(10), 10);
  assertEquals(gteSchema.check(11), 11);
  assertThrows(() => gteSchema.check(9), [{ path: [], error: "number.gte" }]);

  const ltSchema = schema.lt(100);
  assertEquals(ltSchema.check(99), 99);
  assertThrows(() => ltSchema.check(100), [{ path: [], error: "number.lt" }]);

  const lteSchema = schema.lte(100);
  assertEquals(lteSchema.check(100), 100);
  assertEquals(lteSchema.check(99), 99);
  assertThrows(() => lteSchema.check(101), [{ path: [], error: "number.lte" }]);

  const positiveSchema = schema.positive();
  assertEquals(positiveSchema.check(1), 1);
  assertThrows(() => positiveSchema.check(0), [{ path: [], error: "number.positive" }]);

  const negativeSchema = schema.negative();
  assertEquals(negativeSchema.check(-1), -1);
  assertThrows(() => negativeSchema.check(0), [{ path: [], error: "number.negative" }]);

  const stepSchema = schema.step(2);
  assertEquals(stepSchema.check(4), 4);
  assertThrows(() => stepSchema.check(5), [{ path: [], error: "number.step" }]);

  const clampSchema = schema.clamp(10, 100);
  assertEquals(clampSchema.check(50), 50);
  assertEquals(clampSchema.check(10), 10);
  assertEquals(clampSchema.check(100), 100);
  assertThrows(() => clampSchema.check(5), [{ path: [], error: "number.clamp" }]);
  assertThrows(() => clampSchema.check(101), [{ path: [], error: "number.clamp" }]);
});

Deno.test("v.bigint()", () => {
  const schema = v.bigint();

  assertEquals(schema.check(123n), 123n);
  assertEquals(schema.check(0n), 0n);
  assertThrows(() => schema.check("not a bigint" as any), [{ path: [], error: "bigint.invalid_type" }]);
  assertThrows(() => schema.check(true as any), [{ path: [], error: "bigint.invalid_type" }]);
  assertThrows(() => schema.check(null as any), [{ path: [], error: "bigint.invalid_type" }]);
  assertThrows(() => schema.check(undefined as any), [{ path: [], error: "bigint.invalid_type" }]);

  const optionalSchema = schema.optional();
  assertEquals(optionalSchema.check(123n), 123n);
  assertEquals(optionalSchema.check(0n), 0n);
  assertEquals(optionalSchema.check(undefined), undefined);

  const minSchema = schema.min(10n);
  assertEquals(minSchema.check(10n), 10n);
  assertEquals(minSchema.check(20n), 20n);
  assertThrows(() => minSchema.check(5n), [{ path: [], error: "bigint.min" }]);

  const maxSchema = schema.max(100n);
  assertEquals(maxSchema.check(100n), 100n);
  assertEquals(maxSchema.check(50n), 50n);
  assertThrows(() => maxSchema.check(200n), [{ path: [], error: "bigint.max" }]);

  const gtSchema = schema.gt(10n);
  assertEquals(gtSchema.check(11n), 11n);
  assertThrows(() => gtSchema.check(10n), [{ path: [], error: "bigint.gt" }]);

  const gteSchema = schema.gte(10n);
  assertEquals(gteSchema.check(10n), 10n);
  assertEquals(gteSchema.check(11n), 11n);
  assertThrows(() => gteSchema.check(9n), [{ path: [], error: "bigint.gte" }]);

  const ltSchema = schema.lt(100n);
  assertEquals(ltSchema.check(99n), 99n);
  assertThrows(() => ltSchema.check(100n), [{ path: [], error: "bigint.lt" }]);

  const lteSchema = schema.lte(100n);
  assertEquals(lteSchema.check(100n), 100n);
  assertEquals(lteSchema.check(99n), 99n);
  assertThrows(() => lteSchema.check(101n), [{ path: [], error: "bigint.lte" }]);

  const positiveSchema = schema.positive();
  assertEquals(positiveSchema.check(1n), 1n);
  assertThrows(() => positiveSchema.check(0n), [{ path: [], error: "bigint.positive" }]);

  const negativeSchema = schema.negative();
  assertEquals(negativeSchema.check(-1n), -1n);
  assertThrows(() => negativeSchema.check(0n), [{ path: [], error: "bigint.negative" }]);

  const stepSchema = schema.step(2n);
  assertEquals(stepSchema.check(4n), 4n);
  assertThrows(() => stepSchema.check(5n), [{ path: [], error: "bigint.step" }]);

  const clampSchema = schema.clamp(10n, 100n);
  assertEquals(clampSchema.check(50n), 50n);
  assertEquals(clampSchema.check(10n), 10n);
  assertEquals(clampSchema.check(100n), 100n);
  assertThrows(() => clampSchema.check(5n), [{ path: [], error: "bigint.clamp" }]);
  assertThrows(() => clampSchema.check(101n), [{ path: [], error: "bigint.clamp" }]);
});

Deno.test("v.boolean()", () => {
  const schema = v.boolean();

  assertEquals(schema.check(true), true);
  assertEquals(schema.check(false), false);
  assertThrows(() => schema.check("not a boolean" as any), [{ path: [], error: "boolean.invalid_type" }]);
  assertThrows(() => schema.check(123 as any), [{ path: [], error: "boolean.invalid_type" }]);
  assertThrows(() => schema.check(null as any), [{ path: [], error: "boolean.invalid_type" }]);
  assertThrows(() => schema.check(undefined as any), [{ path: [], error: "boolean.invalid_type" }]);

  const optionalSchema = schema.optional();
  assertEquals(optionalSchema.check(true), true);
  assertEquals(optionalSchema.check(false), false);
  assertEquals(optionalSchema.check(undefined), undefined);

  const deepSchema = v.object({
    isActive: v.boolean(),
    isVerified: v.boolean().optional(),
  });
  assertEquals(deepSchema.check({ isActive: true, isVerified: false }), { isActive: true, isVerified: false });
  assertEquals(deepSchema.check({ isActive: false }), { isActive: false });
  assertThrows(() => deepSchema.check({ isActive: "not a boolean" as any }), [{ path: ["isActive"], error: "boolean.invalid_type" }]);
  assertThrows(() => deepSchema.check({ isActive: true, isVerified: "not a boolean" as any }), [{ path: ["isVerified"], error: "boolean.invalid_type" }]);
  assertThrows(() => deepSchema.check(null as any), [{ path: [], error: "object.invalid_type" }]);
  assertThrows(() => deepSchema.check(undefined as any), [{ path: [], error: "object.invalid_type" }]);
  assertThrows(() => deepSchema.check({ isActive: null } as any), [{ path: ["isActive"], error: "boolean.invalid_type" }]);
  assertThrows(() => deepSchema.check({ isActive: true, isVerified: null } as any), [{ path: ["isVerified"], error: "boolean.invalid_type" }]);
});

Deno.test("v.date()", () => {
  const schema = v.date();

  const date = new Date("2023-10-01T00:00:00Z");
  assertEquals(schema.check(date), date);
  assertThrows(() => schema.check("not a date" as any), [{ path: [], error: "date.invalid_type" }]);
  assertThrows(() => schema.check(true as any), [{ path: [], error: "date.invalid_type" }]);
  assertThrows(() => schema.check(null as any), [{ path: [], error: "date.invalid_type" }]);
  assertThrows(() => schema.check(undefined as any), [{ path: [], error: "date.invalid_type" }]);

  const optionalSchema = schema.optional();
  assertEquals(optionalSchema.check(date), date);
  assertEquals(optionalSchema.check(undefined), undefined);

  const minDate = new Date("2023-01-01T00:00:00Z");
  const maxDate = new Date("2023-12-31T23:59:59Z");
  const minSchema = schema.min(minDate);
  assertEquals(minSchema.check(new Date("2023-06-01T00:00:00Z")), new Date("2023-06-01T00:00:00Z"));
  assertThrows(() => minSchema.check(new Date("2022-12-31T23:59:59Z")), [{ path: [], error: "date.min" }]);

  const maxSchema = schema.max(maxDate);
  assertEquals(maxSchema.check(new Date("2023-06-01T00:00:00Z")), new Date("2023-06-01T00:00:00Z"));
  assertThrows(() => maxSchema.check(new Date("2024-01-01T00:00:00Z")), [{ path: [], error: "date.max" }]);
});