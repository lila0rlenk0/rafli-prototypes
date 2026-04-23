import { RuleTester } from "eslint";
import parser from "@typescript-eslint/parser";
import rule from "./no-cn-static-only.js";

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run("no-cn-static-only", rule, {
  valid: [
    // -- conditional: legitimate cn() use
    'cn("base", isActive && "active")',
    // -- multiple args: merge semantics matter
    'cn("p-4", "p-6")',
    // -- template literal with interpolation: dynamic
    "cn(`size-${size}`)",
    // -- passthrough with external prop
    "cn(baseClass, className)",
  ],
  invalid: [
    {
      code: 'cn("size-4 animate-spin")',
      errors: [{ messageId: "staticOnly" }],
    },
    {
      code: "cn(`static template literal`)",
      errors: [{ messageId: "staticOnly" }],
    },
    {
      code: 'const x = <div className={cn("fixed classes")} />',
      errors: [{ messageId: "staticOnly" }],
    },
  ],
});
