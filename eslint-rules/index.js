// -- local ESLint plugin — custom rules enforcing .claude/rules/ conventions
// registered as "local" namespace in eslint.config.mjs
import kebabCaseFilename from "./rules/kebab-case-filename.js";
import noDeepRelativeImports from "./rules/no-deep-relative-imports.js";
import noDefaultExport from "./rules/no-default-export.js";
import noArbitraryClassname from "./rules/no-arbitrary-classname.js";
import noInlineStyle from "./rules/no-inline-style.js";
import booleanNaming from "./rules/boolean-naming.js";
// -- BFF boundary guards
import noFetchOutsideLibApi from "./rules/no-fetch-outside-lib-api.js";
import requireServerOnly from "./rules/require-server-only.js";
import componentsInDomainFolder from "./rules/components-in-domain-folder.js";
// -- style/quality rules distilled from .claude/rules/{comments,code-style}.md
import commentFormat from "./rules/comment-format.js";
import eventHandlerNaming from "./rules/event-handler-naming.js";
// -- comments.md: trailing inline comments forbidden
import noInlineTrailingComment from "./rules/no-inline-trailing-comment.js";
// -- code-style.md: delete dead code, git is the archive
import noCommentedOutCode from "./rules/no-commented-out-code.js";
// -- data-fetching.md + react-effects.md: no useEffect data fetches
import noUseeffectDataFetch from "./rules/no-useeffect-data-fetch.js";
// -- testing.md: behavior assertions over snapshots
import noSnapshotTests from "./rules/no-snapshot-tests.js";
// -- testing.md + e2e: never commit narrowed / disabled runs
import noTestOnlyOrSkip from "./rules/no-test-only-or-skip.js";
// -- e2e: fixed timeouts are always a race waiting to flake
import noWaitForTimeout from "./rules/no-wait-for-timeout.js";
// -- tailwind-v4.md + responsive.md + DESIGN.md: enforce v4 utilities the
// globals.css config is tuned for
import tailwindV4Syntax from "./rules/tailwind-v4-syntax.js";
// -- DESIGN.md: brand-only tokens for landing/marketing surfaces
import marketingRadiusOnlyInLanding from "./rules/marketing-radius-only-in-landing.js";
// -- DESIGN.md typography: "Never Clash Display below 18px"
import noSmallClashDisplay from "./rules/no-small-clash-display.js";
// -- DESIGN.md colors: primary (cyan #00b8ff) is links/progress/selection
// only; buttons, notification badges, unread chips use rafli-black (#141416)
import noPrimaryOnButton from "./rules/no-primary-on-button.js";
import noDisinformativeNames from "./rules/no-disinformative-names.js";
import noFlagArgument from "./rules/no-flag-argument.js";
import noTrainWreck from "./rules/no-train-wreck.js";
import noJournalComment from "./rules/no-journal-comment.js";
import noRedundantElse from "./rules/no-redundant-else.js";
// -- tailwind-css skill: raw strings beat `cn("static string")` (no merge work)
import noCnStaticOnly from "./rules/no-cn-static-only.js";

export default {
  meta: {
    name: "eslint-plugin-local",
    version: "0.0.1",
  },
  rules: {
    "kebab-case-filename": kebabCaseFilename,
    "no-deep-relative-imports": noDeepRelativeImports,
    "no-default-export": noDefaultExport,
    "no-arbitrary-classname": noArbitraryClassname,
    "no-inline-style": noInlineStyle,
    "boolean-naming": booleanNaming,
    "no-fetch-outside-lib-api": noFetchOutsideLibApi,
    "require-server-only": requireServerOnly,
    "components-in-domain-folder": componentsInDomainFolder,
    "comment-format": commentFormat,
    "event-handler-naming": eventHandlerNaming,
    "no-inline-trailing-comment": noInlineTrailingComment,
    "no-commented-out-code": noCommentedOutCode,
    "no-useeffect-data-fetch": noUseeffectDataFetch,
    "no-snapshot-tests": noSnapshotTests,
    "no-test-only-or-skip": noTestOnlyOrSkip,
    "no-wait-for-timeout": noWaitForTimeout,
    "tailwind-v4-syntax": tailwindV4Syntax,
    "marketing-radius-only-in-landing": marketingRadiusOnlyInLanding,
    "no-small-clash-display": noSmallClashDisplay,
    "no-primary-on-button": noPrimaryOnButton,
    "no-disinformative-names": noDisinformativeNames,
    "no-flag-argument": noFlagArgument,
    "no-train-wreck": noTrainWreck,
    "no-journal-comment": noJournalComment,
    "no-redundant-else": noRedundantElse,
    "no-cn-static-only": noCnStaticOnly,
  },
};
