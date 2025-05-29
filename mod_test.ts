// deno-lint-ignore-file no-explicit-any
import { v } from "./mod.ts";
import type { Issue } from "./mod.ts";
import { assertEquals, assertArrayIncludes } from "jsr:@std/assert@^1.0.0";

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

Deno.test("string validator", () => {
  const testStr = v.string().min(3).max(10).regex(/^[a-z]+$/);
  assertEquals(testStr("hello"), "hello");
  assertThrows(() => testStr("hi"), [{ path: [], error: "string.min" }]);
  assertThrows(() => testStr("HI!"), [{ path: [], error: "string.regex" }]);
  assertThrows(() => testStr("H!"), [{ path: [], error: "string.min" }, { path: [], error: "string.regex" }]);
});

Deno.test("number validator", () => {
  const testNum = v.number().min(5).max(10);
  assertEquals(testNum(7), 7);
  assertThrows(() => testNum(11), [{ path: [], error: "number.max" }]);
});

Deno.test("object schema validator - valid", () => {
  const testSchema = v.object({
    name: v.string().min(3).max(10),
    age: v.number().min(18).max(65),
    test: v.number().clamp(0, 100),
    deep: v.object({ nested: v.string().min(2).max(5) }),
  });
  assertEquals(
    testSchema({ name: "Alice", age: 30, test: 10, deep: { nested: "ok" } }),
    { name: "Alice", age: 30, test: 10, deep: { nested: "ok" } }
  );
});

Deno.test("object schema validator - name too short", () => {
  const testSchema = v.object({
    name: v.string().min(3).max(10),
    age: v.number().min(18).max(65),
    test: v.number().clamp(0, 100),
    deep: v.object({ nested: v.string().min(2).max(5) }),
  });

  assertThrows(
    () => testSchema({ name: "Bo", age: 30, test: -100, deep: { nested: "ok" } }),
    [{ path: ["name"], error: "string.min" }, { path: ["test"], error: "number.clamp" }]
  );
});

Deno.test("object schema validator - multiple errors", () => {
  const testSchema = v.object({
    name: v.string().min(3).max(10),
    age: v.number().min(18).max(65),
    test: v.number().clamp(0, 100),
    deep: v.object({ nested: v.string().min(2).max(5) }),
  });
  assertThrows(
    () => testSchema({ name: "Carol", age: 99, test: -100, deep: { nested: "too long" } }),
    [
      { path: ["age"], error: "number.max" },
      { path: ["test"], error: "number.clamp" },
      { path: ["deep", "nested"], error: "string.max" }
    ]
  );
});

Deno.test("object schema validator - optional field", () => {
  const testSchema = v.object({
    name: v.string().min(3).max(10),
    age: v.number().min(18).max(65).optional(),
  });
  assertEquals(
    testSchema({ name: "Dave" }),
    { name: "Dave" }
  );
  assertThrows(
    () => testSchema({ name: "Eve", age: 17 }),
    [{ path: ["age"], error: "number.min" }]
  );
});

Deno.test("array validator", () => {
  const testArray = v.array<number>().min(2).max(5);
  assertArrayIncludes(testArray([1, 2, 3]), [1, 2, 3]);
  assertThrows(() => testArray([1]), [{ path: [], error: "array.min" }]);
  assertThrows(() => testArray([1, 2, 3, 4, 5, 6]), [{ path: [], error: "array.max" }]);
});

Deno.test("enumeration validator", () => {
  const testEnum = v.enum("apple", "banana", "cherry");
  assertEquals(testEnum("banana"), "banana");
  assertThrows(() => testEnum("orange" as any), [{ path: [], error: "enum" }]);
});

Deno.test("equals validator", () => {
  const testEquals = v.equals(42);
  assertEquals(testEquals(42), 42);
  assertThrows(() => testEquals(24), [{ path: [], error: "equals" }]);
  const testCustomError = v.equals(42, "custom_error");
  assertEquals(testCustomError(42), 42);
  assertThrows(() => testCustomError(24), [{ path: [], error: "custom_error" }]);
});

Deno.test("deep object validation", () => {
  const deepSchema = v.object({
    level1: v.object({
      level2: v.object({
        value: v.string().min(1, "string.custom").max(10),
      }),
      arr: v.array().min(1).max(3),
      optionalField: v.string().min(5).optional(),
      single: v.enum("single", "double"),
    }),
  });
  assertEquals(
    deepSchema({
      level1: {
        level2: { value: "test" },
        arr: [1, 2],
        optionalField: "optional",
        single: "single",
      },
    }),
    {
      level1: {
        level2: { value: "test" },
        arr: [1, 2],
        optionalField: "optional",
        single: "single",
      },
    }
  );
  assertThrows(
    () => deepSchema({
      level1: {
        level2: { value: "test" },
        arr: [1, 2, 3, 4],
        optionalField: "opti",
        single: "triple" as any,
      },
    }),
    [
      { path: ["level1", "arr"], error: "array.max" },
      { path: ["level1", "optionalField"], error: "string.min" },
      { path: ["level1", "single"], error: "enum" }
    ]
  );
  assertThrows(
    () => deepSchema({
      level1: {
        level2: { value: "" },
        arr: [],
        optionalField: "optional",
        single: "single",
      },
    }),
    [
      { path: ["level1", "level2", "value"], error: "string.custom" },
      { path: ["level1", "arr"], error: "array.min" }
    ]
  );
});
