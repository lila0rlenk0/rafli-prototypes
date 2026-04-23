import { RuleTester } from "eslint";
import parser from "@typescript-eslint/parser";
import rule from "./no-unencoded-path-interpolation.js";

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  },
});

// The rule is filename-scoped (src/services/** and src/lib/api/**), so
// every case below specifies a filename to exercise the intended scope.
const SERVICE_FILE = "/repo/src/services/example/action.ts";
const OUT_OF_SCOPE_FILE = "/repo/src/app/page.tsx";

ruleTester.run("no-unencoded-path-interpolation", rule, {
  valid: [
    {
      code: "const url = `/raffles/${pathParam(id)}`;",
      filename: SERVICE_FILE,
    },
    {
      code: "const url = `/raffles/${encodeURIComponent(id)}`;",
      filename: SERVICE_FILE,
    },
    // -- Member-style encoder calls (e.g. `utils.pathParam`) still count.
    {
      code: "const url = `/raffles/${utils.pathParam(id)}`;",
      filename: SERVICE_FILE,
    },
    // -- Non-URL templates (no leading "/") are outside the rule's scope.
    {
      code: "const label = `raffle ${id}`;",
      filename: SERVICE_FILE,
    },
    // -- Out-of-scope files are never linted, even with a raw interpolation.
    {
      code: "const url = `/raffles/${id}`;",
      filename: OUT_OF_SCOPE_FILE,
    },
  ],
  invalid: [
    {
      code: "const url = `/raffles/${id}`;",
      filename: SERVICE_FILE,
      errors: [{ messageId: "unencoded" }],
    },
    {
      code: "const url = `/chat/messages/${messageId}/edit`;",
      filename: SERVICE_FILE,
      errors: [{ messageId: "unencoded" }],
    },
    // -- Non-sanctioned wrappers (e.g. `slug(id)`) do not satisfy the rule —
    // explicit review via `pathParam` or `encodeURIComponent` is required.
    {
      code: "const url = `/raffles/${slug(id)}`;",
      filename: SERVICE_FILE,
      errors: [{ messageId: "unencoded" }],
    },
  ],
});
