import { RuleTester } from "eslint";
import parser from "@typescript-eslint/parser";
import rule from "./no-train-wreck.js";

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  },
});

ruleTester.run("no-train-wreck", rule, {
  valid: [
    "const x = a.b.c.d;",
    "const y = process.env.NODE_ENV;",
    "const z = this.a.b.c;",
  ],
  invalid: [
    {
      code: "const x = a.b.c.d.e;",
      errors: [{ messageId: "wreck" }],
    },
  ],
});
