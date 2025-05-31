// deno-lint-ignore-file no-explicit-any
import { v } from "./mod.ts";
import type { Issue } from "./mod.ts";
import { assertEquals } from "jsr:@std/assert@^1.0.0";

const assertThrows = (fn: () => void, issues: Issue[]) => {
  try {
    fn();
    throw new Error("Expected function to throw");
  } catch (error) {
    if (error instanceof Error && error.name === "ValidationError") {
      // Use type assertion to access 'issues'
      assertEquals((error as any).issues as Issue[], issues);
    } else {
      throw error;
    }
  }
};

Deno.test("<type>.path()", () => {
  const strSchema = v.string().max(5).path("first_name");

  assertThrows(() => strSchema("Hello world"), [{ error: "string.max", path: ["first_name"] }])

  const objSchema = v.object({
    lv1: v.object({
      first_name: v.string().max(5).path("some_name")
    }).path("override_lv1"),
    arr: v.object({
      type: v.array(v.string()).min(1).path("things")
    })
  }).path("root");

  assertThrows(() => objSchema({ lv1: { first_name: "Hello world" }, arr: { type: [] } }), [
    { error: "string.max", path: ["root", "override_lv1", "some_name"] },
    { error: "array.min", path: ["root", "arr", "things"] }
  ])

})

Deno.test("v.array()", () => {
  const schema = v.array(v.number());

  assertEquals(schema([1, 2, 3]), [1, 2, 3]);
  assertEquals(schema([]), []);
  assertThrows(() => schema("not an array" as any), [{ path: [], error: "array.invalid_type" }]);
  assertThrows(() => schema(123 as any), [{ path: [], error: "array.invalid_type" }]);
  assertThrows(() => schema(true as any), [{ path: [], error: "array.invalid_type" }]);
  assertThrows(() => schema(null as any), [{ path: [], error: "array.invalid_type" }]);
  assertThrows(() => schema(undefined as any), [{ path: [], error: "array.invalid_type" }]);

  const optionalSchema = schema.optional();
  assertEquals(optionalSchema([1, 2, 3]), [1, 2, 3]);
  assertEquals(optionalSchema([]), []);
  assertEquals(optionalSchema(undefined), undefined);

  const minLengthSchema = schema.min(3);
  assertEquals(minLengthSchema([1, 2, 3]), [1, 2, 3]);
  assertThrows(() => minLengthSchema([1]), [{ path: [], error: "array.min" }]);

  const maxLengthSchema = schema.max(5);
  assertEquals(maxLengthSchema([1, 2]), [1, 2]);
  assertThrows(() => maxLengthSchema([1, 2, 3, 4, 5, 6]), [{ path: [], error: "array.max" }]);

  const uniqueSchema = schema.unique();
  assertEquals(uniqueSchema([1, 2, 3]), [1, 2, 3]);
  assertThrows(() => uniqueSchema([1, 2, 2]), [{ path: [], error: "array.unique" }]);

  const itemsUnionSchema = v.array(v.union(v.string(), v.number()));
  assertEquals(itemsUnionSchema([1, "two", 3]), [1, "two", 3]);
  assertThrows(() => itemsUnionSchema([1, true as any, 3]), [{ path: ["1"], error: "union.invalid_type" }]);

  const itemsOptionalSchema = v.array(v.number().optional());
  assertEquals(itemsOptionalSchema([1, 2, 3]), [1, 2, 3]);
  assertEquals(itemsOptionalSchema([1, undefined, 3]), [1, undefined, 3]);
  assertThrows(() => itemsOptionalSchema([1, "not a number" as any]), [{ path: ["1"], error: "number.invalid_type" }]);
});

Deno.test("v.object()", () => {
  const schema = v.object({
    name: v.string(),
    age: v.number().optional(),
  });

  assertEquals(schema({ name: "Alice", age: 30 }), { name: "Alice", age: 30 });
  assertEquals(schema({ name: "Bob" }), { name: "Bob" });
  assertThrows(() => schema({ name: 123 as any }), [{ path: ["name"], error: "string.invalid_type" }]);
  assertThrows(() => schema({ name: "", age: "not a number" as any }), [{ path: ["age"], error: "number.invalid_type" }]);
  assertThrows(() => schema(null as any), [{ path: [], error: "object.invalid_type" }]);
  assertThrows(() => schema(undefined as any), [{ path: [], error: "object.invalid_type" }]);

  const deepSchema = v.object({
    user: v.object({
      id: v.string(),
      profile: v.object({
        email: v.string().email(),
        age: v.number().optional(),
      }),
    })
  });
  assertEquals(deepSchema({
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
  assertThrows(() => deepSchema({
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
  assertThrows(() => deepSchema(null as any), [{ path: [], error: "object.invalid_type" }]);
  assertThrows(() => deepSchema(undefined as any), [{ path: [], error: "object.invalid_type" }]);
  assertThrows(() => deepSchema({ user: null } as any), [{ path: ["user"], error: "object.invalid_type" }]);
  assertThrows(() => deepSchema({ user: { id: "user123", profile: null } } as any), [{ path: ["user", "profile"], error: "object.invalid_type" }]);

  const optionalDeepSchema = v.object({
    user: v.object({
      id: v.string(),
      profile: v.object({
        email: v.string().email(),
        age: v.number().optional(),
      }).optional(),
    })
  })

  assertEquals(optionalDeepSchema({
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
  assertEquals(optionalDeepSchema({
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
  assertThrows(() => optionalDeepSchema({
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
  assertThrows(() => optionalDeepSchema(null as any), [{ path: [], error: "object.invalid_type" }]);
});


Deno.test("v.union()", () => {
  const schema = v.union(v.string(), v.number());

  assertEquals(schema("hello"), "hello");
  assertEquals(schema(123), 123);
  assertThrows(() => schema(true as any), [{ path: [], error: "union.invalid_type" }]);
  assertThrows(() => schema(null as any), [{ path: [], error: "union.invalid_type" }]);
  assertThrows(() => schema(undefined as any), [{ path: [], error: "union.invalid_type" }]);

  const optionalSchema = schema.optional();
  assertEquals(optionalSchema("hello"), "hello");
  assertEquals(optionalSchema(123), 123);
  assertEquals(optionalSchema(undefined), undefined);

  const deepSchema = v.object({
    value: v.union(v.string(), v.number()),
  });
  assertEquals(deepSchema({ value: "test" }), { value: "test" });
  assertEquals(deepSchema({ value: 42 }), { value: 42 });
  assertThrows(() => deepSchema({ value: true as any }), [{ path: ["value"], error: "union.invalid_type" }]);
});

Deno.test("v.literal()", () => {
  const schema = v.literal("test");

  assertEquals(schema("test"), "test");
  assertThrows(() => schema("not test" as any), [{ path: [], error: "literal.invalid_value" }]);
  assertThrows(() => schema(123 as any), [{ path: [], error: "literal.invalid_value" }]);
  assertThrows(() => schema(true as any), [{ path: [], error: "literal.invalid_value" }]);
  assertThrows(() => schema(null as any), [{ path: [], error: "literal.invalid_value" }]);
  assertThrows(() => schema(undefined as any), [{ path: [], error: "literal.invalid_value" }]);

  const optionalSchema = schema.optional();
  assertEquals(optionalSchema("test"), "test");
  assertEquals(optionalSchema(undefined), undefined);
});

Deno.test("v.enum()", () => {
  const schema = v.enum("apple", "banana", "cherry");

  assertEquals(schema("apple"), "apple");
  assertEquals(schema("banana"), "banana");
  assertEquals(schema("cherry"), "cherry");
  assertThrows(() => schema("orange" as any), [{ path: [], error: "enum.invalid_value" }]);
  assertThrows(() => schema(123 as any), [{ path: [], error: "enum.invalid_value" }]);
  assertThrows(() => schema(true as any), [{ path: [], error: "enum.invalid_value" }]);
  assertThrows(() => schema(null as any), [{ path: [], error: "enum.invalid_value" }]);
  assertThrows(() => schema(undefined as any), [{ path: [], error: "enum.invalid_value" }]);

  const optionalSchema = schema.optional();
  assertEquals(optionalSchema("apple"), "apple");
  assertEquals(optionalSchema(undefined), undefined);
});

Deno.test("v.string()", () => {
  const schema = v.string();

  assertEquals(schema("hello"), "hello");
  assertEquals(schema(""), "");
  assertThrows(() => schema(123 as any), [{ path: [], error: "string.invalid_type" }]);
  assertThrows(() => schema(true as any), [{ path: [], error: "string.invalid_type" }]);
  assertThrows(() => schema(null as any), [{ path: [], error: "string.invalid_type" }]);
  assertThrows(() => schema(undefined as any), [{ path: [], error: "string.invalid_type" }]);

  const optionalSchema = schema.optional();
  assertEquals(optionalSchema("hello"), "hello");
  assertEquals(optionalSchema(""), "");
  assertEquals(optionalSchema(undefined), undefined);

  const minLengthSchema = schema.min(3);
  assertEquals(minLengthSchema("hello"), "hello");
  assertThrows(() => minLengthSchema("hi"), [{ path: [], error: "string.min" }]);

  const maxLengthSchema = schema.max(5);
  assertEquals(maxLengthSchema("hi"), "hi");
  assertThrows(() => maxLengthSchema("hello world"), [{ path: [], error: "string.max" }]);

  const lengthSchema = schema.len(5);
  assertEquals(lengthSchema("hello"), "hello");
  assertThrows(() => lengthSchema("hi"), [{ path: [], error: "string.invalid_length" }]);

  const regexSchema = schema.regex(/^[a-z]+$/);
  assertEquals(regexSchema("hello"), "hello");
  assertThrows(() => regexSchema("Hello"), [{ path: [], error: "string.invalid_regex" }]);

  const startsWithSchema = schema.startsWith("he");
  assertEquals(startsWithSchema("hello"), "hello");
  assertThrows(() => startsWithSchema("world"), [{ path: [], error: "string.starts_with" }]);

  const endsWithSchema = schema.endsWith("lo");
  assertEquals(endsWithSchema("hello"), "hello");
  assertThrows(() => endsWithSchema("world"), [{ path: [], error: "string.ends_with" }]);

  const includesSchema = schema.includes("ll");
  assertEquals(includesSchema("hello"), "hello");
  assertThrows(() => includesSchema("world"), [{ path: [], error: "string.includes" }]);

  const uppercaseSchema = schema.uppercase();
  assertEquals(uppercaseSchema("HELLO"), "HELLO");
  assertThrows(() => uppercaseSchema("Hello"), [{ path: [], error: "string.uppercase" }]);

  const lowercaseSchema = schema.lowercase();
  assertEquals(lowercaseSchema("hello"), "hello");
  assertThrows(() => lowercaseSchema("Hello"), [{ path: [], error: "string.lowercase" }]);

  const emailSchema = schema.email();
  assertEquals(emailSchema("acme@acme.com"), "acme@acme.com");
  assertThrows(() => emailSchema("invalid-email"), [{ path: [], error: "string.invalid_email" }]);
});

Deno.test("v.number()", () => {
  const schema = v.number();

  assertEquals(schema(123), 123);
  assertEquals(schema(0), 0);
  assertThrows(() => schema("not a number" as any), [{ path: [], error: "number.invalid_type" }]);
  assertThrows(() => schema(true as any), [{ path: [], error: "number.invalid_type" }]);
  assertThrows(() => schema(null as any), [{ path: [], error: "number.invalid_type" }]);
  assertThrows(() => schema(undefined as any), [{ path: [], error: "number.invalid_type" }]);

  const optionalSchema = schema.optional();
  assertEquals(optionalSchema(123), 123);
  assertEquals(optionalSchema(0), 0);
  assertEquals(optionalSchema(undefined), undefined);

  const minSchema = schema.min(10);
  assertEquals(minSchema(10), 10);
  assertEquals(minSchema(20), 20);
  assertThrows(() => minSchema(5), [{ path: [], error: "number.min" }]);

  const maxSchema = schema.max(100);
  assertEquals(maxSchema(100), 100);
  assertEquals(maxSchema(50), 50);
  assertThrows(() => maxSchema(200), [{ path: [], error: "number.max" }]);

  const gtSchema = schema.gt(10);
  assertEquals(gtSchema(11), 11);
  assertThrows(() => gtSchema(10), [{ path: [], error: "number.gt" }]);

  const gteSchema = schema.gte(10);
  assertEquals(gteSchema(10), 10);
  assertEquals(gteSchema(11), 11);
  assertThrows(() => gteSchema(9), [{ path: [], error: "number.gte" }]);

  const ltSchema = schema.lt(100);
  assertEquals(ltSchema(99), 99);
  assertThrows(() => ltSchema(100), [{ path: [], error: "number.lt" }]);

  const lteSchema = schema.lte(100);
  assertEquals(lteSchema(100), 100);
  assertEquals(lteSchema(99), 99);
  assertThrows(() => lteSchema(101), [{ path: [], error: "number.lte" }]);

  const positiveSchema = schema.positive();
  assertEquals(positiveSchema(1), 1);
  assertThrows(() => positiveSchema(0), [{ path: [], error: "number.positive" }]);

  const negativeSchema = schema.negative();
  assertEquals(negativeSchema(-1), -1);
  assertThrows(() => negativeSchema(0), [{ path: [], error: "number.negative" }]);

  const stepSchema = schema.step(2);
  assertEquals(stepSchema(4), 4);
  assertThrows(() => stepSchema(5), [{ path: [], error: "number.step" }]);

  const clampSchema = schema.clamp(10, 100);
  assertEquals(clampSchema(50), 50);
  assertEquals(clampSchema(10), 10);
  assertEquals(clampSchema(100), 100);
  assertThrows(() => clampSchema(5), [{ path: [], error: "number.clamp" }]);
  assertThrows(() => clampSchema(101), [{ path: [], error: "number.clamp" }]);
});

Deno.test("v.bigint()", () => {
  const schema = v.bigint();

  assertEquals(schema(123n), 123n);
  assertEquals(schema(0n), 0n);
  assertThrows(() => schema("not a bigint" as any), [{ path: [], error: "bigint.invalid_type" }]);
  assertThrows(() => schema(true as any), [{ path: [], error: "bigint.invalid_type" }]);
  assertThrows(() => schema(null as any), [{ path: [], error: "bigint.invalid_type" }]);
  assertThrows(() => schema(undefined as any), [{ path: [], error: "bigint.invalid_type" }]);

  const optionalSchema = schema.optional();
  assertEquals(optionalSchema(123n), 123n);
  assertEquals(optionalSchema(0n), 0n);
  assertEquals(optionalSchema(undefined), undefined);

  const minSchema = schema.min(10n);
  assertEquals(minSchema(10n), 10n);
  assertEquals(minSchema(20n), 20n);
  assertThrows(() => minSchema(5n), [{ path: [], error: "bigint.min" }]);

  const maxSchema = schema.max(100n);
  assertEquals(maxSchema(100n), 100n);
  assertEquals(maxSchema(50n), 50n);
  assertThrows(() => maxSchema(200n), [{ path: [], error: "bigint.max" }]);

  const gtSchema = schema.gt(10n);
  assertEquals(gtSchema(11n), 11n);
  assertThrows(() => gtSchema(10n), [{ path: [], error: "bigint.gt" }]);

  const gteSchema = schema.gte(10n);
  assertEquals(gteSchema(10n), 10n);
  assertEquals(gteSchema(11n), 11n);
  assertThrows(() => gteSchema(9n), [{ path: [], error: "bigint.gte" }]);

  const ltSchema = schema.lt(100n);
  assertEquals(ltSchema(99n), 99n);
  assertThrows(() => ltSchema(100n), [{ path: [], error: "bigint.lt" }]);

  const lteSchema = schema.lte(100n);
  assertEquals(lteSchema(100n), 100n);
  assertEquals(lteSchema(99n), 99n);
  assertThrows(() => lteSchema(101n), [{ path: [], error: "bigint.lte" }]);

  const positiveSchema = schema.positive();
  assertEquals(positiveSchema(1n), 1n);
  assertThrows(() => positiveSchema(0n), [{ path: [], error: "bigint.positive" }]);

  const negativeSchema = schema.negative();
  assertEquals(negativeSchema(-1n), -1n);
  assertThrows(() => negativeSchema(0n), [{ path: [], error: "bigint.negative" }]);

  const stepSchema = schema.step(2n);
  assertEquals(stepSchema(4n), 4n);
  assertThrows(() => stepSchema(5n), [{ path: [], error: "bigint.step" }]);

  const clampSchema = schema.clamp(10n, 100n);
  assertEquals(clampSchema(50n), 50n);
  assertEquals(clampSchema(10n), 10n);
  assertEquals(clampSchema(100n), 100n);
  assertThrows(() => clampSchema(5n), [{ path: [], error: "bigint.clamp" }]);
  assertThrows(() => clampSchema(101n), [{ path: [], error: "bigint.clamp" }]);
});

Deno.test("v.boolean()", () => {
  const schema = v.boolean();

  assertEquals(schema(true), true);
  assertEquals(schema(false), false);
  assertThrows(() => schema("not a boolean" as any), [{ path: [], error: "boolean.invalid_type" }]);
  assertThrows(() => schema(123 as any), [{ path: [], error: "boolean.invalid_type" }]);
  assertThrows(() => schema(null as any), [{ path: [], error: "boolean.invalid_type" }]);
  assertThrows(() => schema(undefined as any), [{ path: [], error: "boolean.invalid_type" }]);

  const optionalSchema = schema.optional();
  assertEquals(optionalSchema(true), true);
  assertEquals(optionalSchema(false), false);
  assertEquals(optionalSchema(undefined), undefined);

  const deepSchema = v.object({
    isActive: v.boolean(),
    isVerified: v.boolean().optional(),
  });
  assertEquals(deepSchema({ isActive: true, isVerified: false }), { isActive: true, isVerified: false });
  assertEquals(deepSchema({ isActive: false }), { isActive: false });
  assertThrows(() => deepSchema({ isActive: "not a boolean" as any }), [{ path: ["isActive"], error: "boolean.invalid_type" }]);
  assertThrows(() => deepSchema({ isActive: true, isVerified: "not a boolean" as any }), [{ path: ["isVerified"], error: "boolean.invalid_type" }]);
  assertThrows(() => deepSchema(null as any), [{ path: [], error: "object.invalid_type" }]);
  assertThrows(() => deepSchema(undefined as any), [{ path: [], error: "object.invalid_type" }]);
  assertThrows(() => deepSchema({ isActive: null } as any), [{ path: ["isActive"], error: "boolean.invalid_type" }]);
  assertThrows(() => deepSchema({ isActive: true, isVerified: null } as any), [{ path: ["isVerified"], error: "boolean.invalid_type" }]);
});

Deno.test("v.date()", () => {
  const schema = v.date();

  const date = new Date("2023-10-01T00:00:00Z");
  assertEquals(schema(date), date);
  assertThrows(() => schema("not a date" as any), [{ path: [], error: "date.invalid_type" }]);
  assertThrows(() => schema(true as any), [{ path: [], error: "date.invalid_type" }]);
  assertThrows(() => schema(null as any), [{ path: [], error: "date.invalid_type" }]);
  assertThrows(() => schema(undefined as any), [{ path: [], error: "date.invalid_type" }]);

  const optionalSchema = schema.optional();
  assertEquals(optionalSchema(date), date);
  assertEquals(optionalSchema(undefined), undefined);

  const minDate = new Date("2023-01-01T00:00:00Z");
  const maxDate = new Date("2023-12-31T23:59:59Z");
  const minSchema = schema.min(minDate);
  assertEquals(minSchema(new Date("2023-06-01T00:00:00Z")), new Date("2023-06-01T00:00:00Z"));
  assertThrows(() => minSchema(new Date("2022-12-31T23:59:59Z")), [{ path: [], error: "date.min" }]);

  const maxSchema = schema.max(maxDate);
  assertEquals(maxSchema(new Date("2023-06-01T00:00:00Z")), new Date("2023-06-01T00:00:00Z"));
  assertThrows(() => maxSchema(new Date("2024-01-01T00:00:00Z")), [{ path: [], error: "date.max" }]);
});