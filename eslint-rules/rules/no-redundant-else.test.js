import { RuleTester } from "eslint";
import parser from "@typescript-eslint/parser";
import rule from "./no-redundant-else.js";

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  },
});

ruleTester.run("no-redundant-else", rule, {
  valid: [
    "if (a) { throw x; } else { return 1; }",
    "if (a) { f(); } else if (b) { g(); }",
  ],
  invalid: [
    {
      code: "if (a) { f(); } else { throw err; }",
      errors: [{ messageId: "elseThrow" }],
    },
  ],
});
