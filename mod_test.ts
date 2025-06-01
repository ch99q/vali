// deno-lint-ignore-file no-explicit-any
import { v } from "./mod.ts";
import { assertEquals } from "jsr:@std/assert@^1.0.0";

const assertThrows = (fn: () => void, issues: Array<Omit<v.Issue, "key">>) => {
  try {
    fn();
    throw new Error("Expected function to throw");
  } catch (error) {
    if (error instanceof Error && error.name === "ValidationError") {
      // Add 'key' to each expected issue for comparison
      const withKey = issues.map(issue => ({
        ...issue,
        key: `${issue.path.join('.')}@${issue.error}`
      }));
      assertEquals((error as any).issues as v.Issue[], withKey);
    } else {
      throw error;
    }
  }
};

Deno.test("<type>.path()", () => {
  // Checking validator primitives with path overrides.
  const strSchema = v.string().max(5).path("first_name");
  const defStrSchema = v.string().max(5);
  assertThrows(() => strSchema.check(23123 as any), [{ error: "string.invalid_type", path: ["first_name"] }])
  assertThrows(() => strSchema.check("Hello world"), [{ error: "string.max", path: ["first_name"] }])
  assertThrows(() => defStrSchema.check(23123 as any), [{ error: "string.invalid_type", path: [] }]);

  // Checking boolean with path override.
  const boolSchema = v.boolean().path("is_active");
  const defBoolSchema = v.boolean();
  assertThrows(() => boolSchema.check("not a boolean" as any), [{ error: "boolean.invalid_type", path: ["is_active"] }]);
  assertThrows(() => defBoolSchema.check("not a boolean" as any), [{ error: "boolean.invalid_type", path: [] }]);

  // Checking record with path override.
  const recSchema = v.record(v.string()).path("user_data");
  const defRecSchema = v.record(v.string());
  assertThrows(() => recSchema.check("not an object" as any), [{ error: "record.invalid_type", path: ["user_data"] }]);
  assertThrows(() => defRecSchema.check("not an object" as any), [{ error: "record.invalid_type", path: [] }]);

  // Checking enum with path override.
  const enumSchema = v.enum("apple", "banana", "cherry").path("fruit_type");
  const defEnumSchema = v.enum("apple", "banana", "cherry");
  assertThrows(() => enumSchema.check("orange" as any), [{ error: "enum.invalid_value", path: ["fruit_type"] }]);
  assertThrows(() => defEnumSchema.check("orange" as any), [{ error: "enum.invalid_value", path: [] }]);

  // Checking literal with path override.
  const literalSchema = v.literal("test").path("status");
  const defLiteralSchema = v.literal("test");
  assertThrows(() => literalSchema.check("not test" as any), [{ error: "literal.invalid_value", path: ["status"] }]);
  assertThrows(() => defLiteralSchema.check("not test" as any), [{ error: "literal.invalid_value", path: [] }]);

  // Checking union with path override.
  const unionSchema = v.union([v.string(), v.number()]).path("value");
  const defUnionSchema = v.union([v.string(), v.number()]);
  assertThrows(() => unionSchema.check(true as any), [{ error: "union.invalid_type", path: ["value"] }]);
  assertThrows(() => defUnionSchema.check({} as any), [{ error: "union.invalid_type", path: [] }]);

  // Checking array with path override.
  const arraySchema = v.array(v.string()).path("tags");
  const defArraySchema = v.array(v.string());
  assertThrows(() => arraySchema.check(123 as any), [{ error: "array.invalid_type", path: ["tags"] }]);
  assertThrows(() => defArraySchema.check(123 as any), [{ error: "array.invalid_type", path: [] }]);

  // Checking object with path override.
  const userSchema = v.object({
    name: v.string().max(50).path("user_name"),
    age: v.number().min(0).optional().path("user_age"),
  }).path("user_info");
  const defUserSchema = v.object({
    name: v.string().max(50),
    age: v.number().min(0).optional(),
  });
  assertThrows(() => userSchema.check({ name: 123 as any }), [{ error: "string.invalid_type", path: ["user_info", "name"] }]);
  assertThrows(() => userSchema.check({ name: "Alice", age: "not a number" as any }), [{ error: "number.invalid_type", path: ["user_info", "age"] }]);
  assertThrows(() => defUserSchema.check({ name: 123 as any }), [{ error: "string.invalid_type", path: ["name"] }]);
  assertThrows(() => defUserSchema.check({ name: "Alice", age: "not a number" as any }), [{ error: "number.invalid_type", path: ["age"] }]);

  // Checking nested object with path override.
  const nestedSchema = v.object({
    user: userSchema,
    str: v.string().max(10).path("description"),
    bool: v.boolean().path("is_active"),
    rec: v.record(v.string()).path("user_data"),
    enum: v.enum("apple", "banana", "cherry").path("fruit_type"),
    literal: v.literal("test").path("status"),
    union: v.union([v.string(), v.number()]).path("value"),
    array: v.array(v.string()).path("tags"),
  }).path("data");
  assertThrows(() => nestedSchema.check({ 
    user: { name: 123 as any, age: -5 },
    str: "This is a test string that is way too long for the max length",
    bool: "not a boolean" as any,
    rec: "not an object" as any,
    enum: "orange" as any,
    literal: "not test" as any,
    union: true as any,
    array: 123 as any,
  }), [
    { error: "string.invalid_type", path: ["data", "user", "name"] },
    { error: "number.min", path: ["data", "user", "age"] },
    { error: "string.max", path: ["data", "str"] },
    { error: "boolean.invalid_type", path: ["data", "bool"] },
    { error: "record.invalid_type", path: ["data", "rec"] },
    { error: "enum.invalid_value", path: ["data", "enum"] },
    { error: "literal.invalid_value", path: ["data", "literal"] },
    { error: "union.invalid_type", path: ["data", "union"] },
    { error: "array.invalid_type", path: ["data", "array"] },
  ]);
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
        email: v.email(),
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
        email: v.email(),
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

Deno.test("v.record()", () => {
  const schema = v.record(v.number());

  // Valid cases
  assertEquals(schema.check({ key1: 1, key2: 2 }), { key1: 1, key2: 2 });
  assertEquals(schema.check({}), {});

  // Invalid type cases
  for (const value of ["not an object", 123, true, null, undefined]) {
    assertThrows(() => schema.check(value as any), [{ path: [], error: "record.invalid_type" }]);
  }

  // Invalid value cases
  assertThrows(() => schema.check({ key1: "not a number" as any }), [{ path: ["key1"], error: "number.invalid_type" }]);
  assertThrows(() => schema.check({ key1: 1, key2: "not a number" as any }), [{ path: ["key2"], error: "number.invalid_type" }]);
  assertThrows(() => schema.check({ key1: 1, key2: null as any }), [{ path: ["key2"], error: "number.invalid_type" }]);
  assertThrows(() => schema.check({ key1: 1, key2: undefined as any }), [{ path: ["key2"], error: "number.invalid_type" }]);

  // Optional schema
  const optionalSchema = schema.optional();
  assertEquals(optionalSchema.check({ key1: 1, key2: 2 }), { key1: 1, key2: 2 });
  assertEquals(optionalSchema.check({}), {});
  assertEquals(optionalSchema.check(undefined), undefined);

  // Optional schema invalid type cases
  for (const value of ["not an object", 123, true, null]) {
    assertThrows(() => optionalSchema.check(value as any), [{ path: [], error: "record.invalid_type" }]);
  }

  // Optional schema invalid value cases
  assertThrows(() => optionalSchema.check({ key1: "not a number" as any }), [{ path: ["key1"], error: "number.invalid_type" }]);
  assertThrows(() => optionalSchema.check({ key1: 1, key2: "not a number" as any }), [{ path: ["key2"], error: "number.invalid_type" }]);
  assertThrows(() => optionalSchema.check({ key1: 1, key2: null as any }), [{ path: ["key2"], error: "number.invalid_type" }]);
  assertThrows(() => optionalSchema.check({ key1: 1, key2: undefined as any }), [{ path: ["key2"], error: "number.invalid_type" }]);

  const unionRecordSchema = v.record(v.union([v.string(), v.number()]));

  // Valid cases
  assertEquals(unionRecordSchema.check({ key1: "value", key2: 123 }), { key1: "value", key2: 123 });
  assertEquals(unionRecordSchema.check({ key1: "value", key2: "another value" }), { key1: "value", key2: "another value" });
  assertEquals(unionRecordSchema.check({}), {});
  assertEquals(unionRecordSchema.check({ key1: 123, key2: 456 }), { key1: 123, key2: 456 });
  assertEquals(unionRecordSchema.check({ key1: "value", key2: 456 }), { key1: "value", key2: 456 });
  assertEquals(unionRecordSchema.check({ key1: 123, key2: "another value" }), { key1: 123, key2: "another value" });

  // Invalid type cases
  for (const value of ["not an object", 123, true, null, undefined]) {
    assertThrows(() => unionRecordSchema.check(value as any), [{ path: [], error: "record.invalid_type" }]);
  }
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

Deno.test("v.<aliases>()", () => {
  const emailSchema = v.email();
  assertEquals(emailSchema.check("acme@acme.com"), "acme@acme.com");
  assertThrows(() => emailSchema.check("invalid-email"), [{ path: [], error: "string.invalid_email" }]);

  const urlSchema = v.url();
  assertEquals(urlSchema.check("https://example.com"), "https://example.com");
  assertThrows(() => urlSchema.check("not a url"), [{ path: [], error: "string.invalid_url" }]);

  const uuidSchema = v.uuid();
  assertEquals(uuidSchema.check("123e4567-e89b-12d3-a456-426614174000"), "123e4567-e89b-12d3-a456-426614174000");
  assertThrows(() => uuidSchema.check("not-a-uuid"), [{ path: [], error: "string.invalid_uuid" }]);

  const hexSchema = v.hex();
  assertEquals(hexSchema.check("deadbeef"), "deadbeef");
  assertThrows(() => hexSchema.check("nothex!"), [{ path: [], error: "string.invalid_hex" }]);

  const ipSchema = v.ip();
  assertEquals(ipSchema.check("192.168.1.1"), "192.168.1.1");
  assertThrows(() => ipSchema.check("999.999.999.999"), [{ path: [], error: "string.invalid_ip" }]);

  const macSchema = v.mac();
  assertEquals(macSchema.check("00:1a:2b:3c:4d:5e"), "00:1a:2b:3c:4d:5e");
  assertThrows(() => macSchema.check("notamac"), [{ path: [], error: "string.invalid_mac" }]);

  const base64Schema = v.base64();
  assertEquals(base64Schema.check("SGVsbG8="), "SGVsbG8=");
  assertThrows(() => base64Schema.check("not base64!"), [{ path: [], error: "string.invalid_base64" }]);
});