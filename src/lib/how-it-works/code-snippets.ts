/**
 * Code snippets rendered in the "For the tech-savvy" section of the
 * How It Works page. Kept in a dedicated module so page.tsx stays focused
 * on layout, and so the strings can be reused (e.g., from docs or tests)
 * without pulling in JSX.
 *
 * Only the snippets actively rendered in page.tsx live here — historical
 * variants (MERKLE/VRF/IPFS/ARBITRUM) were removed when the tech-card
 * grid was replaced by the simplified numbered-step explanation.
 */

/**
 * Three-phase commit-reveal protocol: lock ticket data before any
 * randomness exists, generate the random number from an external source,
 * then apply it to the locked data. Shipped as a literal string so it
 * renders inside <pre><code> without JSX interpretation.
 */
export const COMMIT_REVEAL_CODE = `// Commit-Reveal Protocol
// Step 1: Before random number exists
const ticketManifest = buildManifest(allTickets);
const commitHash = sha256(ticketManifest);
await blockchain.commit(commitHash); // Locked forever

// Step 2: Random number generated (can't be influenced)
const randomNumber = await chainlinkVRF.getRandomNumber();

// Step 3: Apply random to committed data
const winner = selectWinner(ticketManifest, randomNumber);
// Manipulation impossible: data locked before randomness`;

/**
 * The exact modulo formula used by the draw. Uses BigInt to match the
 * on-chain math (VRF random words are 256-bit). Anyone running this with
 * the same inputs produces the same winning ticket — that reproducibility
 * is the whole point of the verification section.
 */
export const WINNER_FORMULA_CODE = `// Winner Selection Formula
const randomNumber = BigInt("0x7a3b9c2d...4f2c1e8a");
const totalTickets = 12_847n;

// Simple modulo operation
const winningIndex = Number(randomNumber % totalTickets);
const winningTicket = winningIndex + 1;

// Result: Ticket #8432 wins
// Anyone can verify: (random % 12847) + 1 = 8432`;
