import { RuleTester } from "eslint";
import parser from "@typescript-eslint/parser";
import rule from "./no-disinformative-names.js";

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  },
});

ruleTester.run("no-disinformative-names", rule, {
  valid: [
    {
      code: "export function createChat() {}",
      filename: "/repo/src/chat-format.ts",
    },
    {
      code: "export type Btn = React.MouseEventHandler<HTMLButtonElement>;",
      filename: "/repo/src/types.ts",
    },
  ],
  invalid: [
    {
      code: "export const x = 1",
      filename: "/repo/src/chat-utils.ts",
      errors: [{ messageId: "file" }],
    },
    {
      code: "export const UserUtils = {}",
      filename: "/repo/src/ok-path.ts",
      errors: [{ messageId: "export" }],
    },
  ],
});
