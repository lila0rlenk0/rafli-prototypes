import { RuleTester } from "eslint";
import parser from "@typescript-eslint/parser";
import rule from "./no-mutation-handle-in-deps.js";

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

ruleTester.run("no-mutation-handle-in-deps", rule, {
  valid: [
    // Destructured `mutate` is stable — fine in deps.
    `
      const { mutate } = useFooMutation();
      useEffect(() => { mutate(); }, [mutate]);
    `,
    // Destructured `data` from useQuery — fine.
    `
      const { data } = useBarQuery();
      useMemo(() => data?.length, [data]);
    `,
    // Bare useMutation result, but only `.mutate` is referenced via its destructured form.
    `
      const { mutate, isPending } = useMutation({ mutationFn: f });
      useCallback(() => mutate(x), [mutate]);
    `,
    // Other hooks (useState, useRef, useChatStore selector) untouched.
    `
      const value = useChatStore(s => s.value);
      useEffect(() => { fn(value); }, [value]);
    `,
    // Array dep without the handle name — fine.
    `
      const handle = useFooMutation();
      const id = "x";
      useEffect(() => {}, [id]);
    `,
  ],
  invalid: [
    // Custom hook wrapping useMutation — non-destructured handle in deps.
    {
      code: `
        const markReadMutation = useMarkConversationRead();
        useEffect(() => {
          markReadMutation.mutate({});
        }, [markReadMutation]);
      `,
      errors: [{ messageId: "handleInDeps", data: { name: "markReadMutation" } }],
    },
    // Bare useMutation, full handle in deps.
    {
      code: `
        const m = useMutation({ mutationFn: f });
        useCallback(() => m.mutate(), [m]);
      `,
      errors: [{ messageId: "handleInDeps", data: { name: "m" } }],
    },
    // useQuery handle in useMemo deps.
    {
      code: `
        const q = useFooQuery();
        useMemo(() => q.data, [q]);
      `,
      errors: [{ messageId: "handleInDeps", data: { name: "q" } }],
    },
    // Mixed deps array — flags only the handle.
    {
      code: `
        const handle = useBarMutation();
        const id = "x";
        useEffect(() => {}, [id, handle]);
      `,
      errors: [{ messageId: "handleInDeps", data: { name: "handle" } }],
    },
  ],
});
