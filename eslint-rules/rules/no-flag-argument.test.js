import { RuleTester } from "eslint";
import parser from "@typescript-eslint/parser";
import rule from "./no-flag-argument.js";

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  },
});

ruleTester.run("no-flag-argument", rule, {
  valid: [
    "function f(x: string) {}",
    "const g = () => { const h = (x: boolean) => x; return h; };",
    "h((x: boolean) => x);",
  ],
  invalid: [
    {
      code: "function f(x: boolean) {}",
      errors: [{ messageId: "flag" }],
    },
    {
      code: "export const run = (x: boolean) => x;",
      errors: [{ messageId: "flag" }],
    },
    {
      code: "class C { m(x: boolean) {} }",
      errors: [{ messageId: "flag" }],
    },
  ],
});
