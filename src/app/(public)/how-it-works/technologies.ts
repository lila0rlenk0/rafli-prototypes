import { Database, Dice5, Link2, TreeDeciduous } from 'lucide-react';

import {
	ARBITRUM_CODE,
	IPFS_CODE,
	MERKLE_CODE,
	VRF_CODE,
} from './code-snippets';

/**
 * Technology data for Key Technologies section
 */
export const TECHNOLOGIES = [
	{
		id: 'ipfs',
		icon: Database,
		title: 'IPFS',
		color: 'purple',
		description:
			'Ticket data stored on a global, permanent network. Once uploaded, data cannot be changed.',
		analogy:
			"Like publishing in a newspaper—everyone can see it, and you can't rewrite history.",
		code: IPFS_CODE,
		links: [{ label: 'IPFS Docs', href: 'https://docs.ipfs.tech/' }],
	},
	{
		id: 'vrf',
		icon: Dice5,
		title: 'Chainlink VRF',
		color: 'blue',
		description:
			"Random numbers from Chainlink's Verifiable Random Function on the blockchain.",
		analogy:
			"Like a third-party auditor rolling dice that even the casino can't control.",
		code: VRF_CODE,
		links: [{ label: 'VRF Docs', href: 'https://docs.chain.link/vrf' }],
	},
	{
		id: 'merkle',
		icon: TreeDeciduous,
		title: 'Merkle Tree',
		color: 'green',
		description:
			'All tickets organized in a structure that creates a unique fingerprint for the entire dataset.',
		analogy:
			"Like a family tree where changing one ancestor would change everyone's DNA.",
		code: MERKLE_CODE,
		links: [],
	},
	{
		id: 'arbitrum',
		icon: Link2,
		title: 'Arbitrum One',
		color: 'orange',
		description:
			'Ethereum L2 for fast, cheap commits with full security. All proofs permanently recorded.',
		analogy: "Like a notary that never sleeps and can't be bribed.",
		code: ARBITRUM_CODE,
		links: [{ label: 'Arbiscan', href: 'https://arbiscan.io/' }],
	},
] as const;

export type TechnologyColor = (typeof TECHNOLOGIES)[number]['color'];

/**
 * Color classes for technology cards
 */
export const COLOR_CLASSES = {
	purple: {
		icon: 'text-purple-600',
		border: 'border-purple-200',
		bg: 'bg-purple-50',
		ring: 'ring-purple-500',
	},
	blue: {
		icon: 'text-blue-600',
		border: 'border-blue-200',
		bg: 'bg-blue-50',
		ring: 'ring-blue-500',
	},
	green: {
		icon: 'text-green-600',
		border: 'border-green-200',
		bg: 'bg-green-50',
		ring: 'ring-green-500',
	},
	orange: {
		icon: 'text-orange-600',
		border: 'border-orange-200',
		bg: 'bg-orange-50',
		ring: 'ring-orange-500',
	},
} as const;
