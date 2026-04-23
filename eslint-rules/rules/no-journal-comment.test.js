import { RuleTester } from "eslint";
import parser from "@typescript-eslint/parser";
import rule from "./no-journal-comment.js";

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  },
});

ruleTester.run("no-journal-comment", rule, {
  valid: ["// -- section", "// why: invariant from API"],
  invalid: [
    { code: "// NOTE: fix", errors: [{ messageId: "journal" }] },
    { code: "// 2026-04-01 release", errors: [{ messageId: "journal" }] },
    { code: "// @author me", errors: [{ messageId: "journal" }] },
    { code: "// CHANGELOG: x", errors: [{ messageId: "journal" }] },
  ],
});
