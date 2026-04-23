// -- Clean Code: names reveal intent. Suffixes like Utils/Helper/Handler/Data
// are noise — rename to the domain verb or noun (e.g. chat-format, pay-errors).

const BAD_BASENAMES = new Set([
  "utils",
  "helpers",
  "helper",
  "handlers",
  "handler",
  "wrapper",
  "manager",
  "impl",
  "info",
  "data",
]);

const BAD_SUFFIX = [
  "-utils",
  "-helpers",
  "-helper",
  "-handlers",
  "-handler",
  "-wrapper",
  "-manager",
  "-impl",
  "-info",
  "-data",
];

// -- Exported symbols: Handler/Helper/Utils/Impl/Wrapper/Manager are noise.
// `*FormData` stays — matches HTML + RHF field bags. `*Data` elsewhere still
// smells; use `Payload` / `Snapshot`. `Info` is too noisy to lint blindly
// (e.g. ShippingInfo) — filenames still ban `-info`.
const BAD_ID = /(Manager|Handlers?|Helpers?|Wrapper|Impl|Utils|(?<!Form)Data)$/u;
const ALLOW_ID = /EventHandler$/u;

function filenameStem(filename) {
  const base = filename.replace(/^.*[/\\]/u, "");
  return base.replace(/\.(tsx?|jsx?)$/iu, "").toLowerCase();
}

function isBadFilename(stem) {
  if (BAD_BASENAMES.has(stem)) return true;
  return BAD_SUFFIX.some((s) => stem.endsWith(s));
}

function checkExportedName(node, name) {
  if (!name || ALLOW_ID.test(name)) return;
  if (!BAD_ID.test(name)) return;
  return name;
}

export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow disinformative name suffixes (Utils, Helper, Handler, …) in filenames and exports.",
    },
    messages: {
      file: 'Filename "{{ stem }}" uses a banned suffix (Utils/Helper/Handler/Data/…). Rename to an intention-revealing topic.',
      export: 'Exported name "{{ name }}" uses a disinformative suffix. Prefer a domain-specific name.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename?.();
    const stem = filename ? filenameStem(filename) : "";

    return {
      Program(node) {
        if (!stem || stem === "program") return;
        if (filename.includes("node_modules")) return;
        if (isBadFilename(stem)) {
          context.report({ node, messageId: "file", data: { stem } });
        }
      },
      ExportNamedDeclaration(node) {
        const decl = node.declaration;
        if (!decl) return;
        if (decl.type === "FunctionDeclaration" && decl.id) {
          const bad = checkExportedName(decl.id, decl.id.name);
          if (bad) context.report({ node: decl.id, messageId: "export", data: { name: bad } });
        }
        if (decl.type === "VariableDeclaration") {
          for (const d of decl.declarations) {
            if (d.id.type !== "Identifier") continue;
            const bad = checkExportedName(d.id, d.id.name);
            if (bad) context.report({ node: d.id, messageId: "export", data: { name: bad } });
          }
        }
        if (decl.type === "TSInterfaceDeclaration" && decl.id) {
          const bad = checkExportedName(decl.id, decl.id.name);
          if (bad) context.report({ node: decl.id, messageId: "export", data: { name: bad } });
        }
        if (decl.type === "TSTypeAliasDeclaration" && decl.id) {
          const bad = checkExportedName(decl.id, decl.id.name);
          if (bad) context.report({ node: decl.id, messageId: "export", data: { name: bad } });
        }
        if (decl.type === "ClassDeclaration" && decl.id) {
          const bad = checkExportedName(decl.id, decl.id.name);
          if (bad) context.report({ node: decl.id, messageId: "export", data: { name: bad } });
        }
      },
      ExportDefaultDeclaration(node) {
        const d = node.declaration;
        if (!d) return;
        if (d.type === "FunctionDeclaration" && d.id) {
          const bad = checkExportedName(d.id, d.id.name);
          if (bad) context.report({ node: d.id, messageId: "export", data: { name: bad } });
        }
        if (d.type === "ClassDeclaration" && d.id) {
          const bad = checkExportedName(d.id, d.id.name);
          if (bad) context.report({ node: d.id, messageId: "export", data: { name: bad } });
        }
      },
      ExportSpecifier(node) {
        const exported = node.exported.type === "Identifier" ? node.exported.name : null;
        const bad = checkExportedName(node.exported, exported);
        if (bad) context.report({ node: node.exported, messageId: "export", data: { name: bad } });
      },
    };
  },
};
