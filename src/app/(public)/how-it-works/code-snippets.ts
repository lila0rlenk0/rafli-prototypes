/**
 * Code snippets for the How It Works page
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

export const WINNER_FORMULA_CODE = `// Winner Selection Formula
const randomNumber = BigInt("0x7a3b9c2d...4f2c1e8a");
const totalTickets = 12_847n;

// Simple modulo operation
const winningIndex = Number(randomNumber % totalTickets);
const winningTicket = winningIndex + 1;

// Result: Ticket #8432 wins
// Anyone can verify: (random % 12847) + 1 = 8432`;

export const MERKLE_CODE = `// Merkle Tree Verification
const ticketHash = sha256(\`\${ticketId}|\${ticketCode}|\${participantId}\`);

// Verify ticket was committed before draw
const isValid = verifyMerkleProof(
  ticketHash,    // Your ticket's hash
  proof,         // Path from ticket to root
  merkleRoot     // Root stored on blockchain
);

// true = ticket existed in committed set`;

export const VRF_CODE = `// Chainlink VRF (Verifiable Random Function)
// Random number from blockchain, not Raffly servers

const vrfResponse = await chainlink.requestRandomWords({
  keyHash: "0x...",      // Public verification key
  subscriptionId: 123,
  requestConfirmations: 3,
  numWords: 1
});

// Output is cryptographically tied to block data
// Raffly cannot predict or influence the result`;

export const IPFS_CODE = `// IPFS Content Addressing
const manifest = JSON.stringify({
  raffleId: "raffle_abc123",
  totalTickets: 12847,
  tickets: [...],
  createdAt: "2024-01-15T10:30:00Z"
});

const ipfsHash = await ipfs.add(manifest);
// Returns: "QmX4z...8Yk" (content-addressed hash)

// Same data = same hash, always
// Change 1 byte = completely different hash`;

export const ARBITRUM_CODE = `// Arbitrum One - L2 Blockchain
// Fast, cheap transactions with Ethereum security

const tx = await arbitrumContract.commit({
  raffleId: "raffle_abc123",
  merkleRoot: "0x123...789",
  ipfsHash: "QmX4z...8Yk",
  timestamp: Date.now()
});

// Transaction hash becomes permanent proof
// Viewable on Arbiscan by anyone`;
