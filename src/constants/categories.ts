/**
 * Raffle category definitions
 */

export const RAFFLE_CATEGORIES = [
	{
		id: '019ba0f7-020c-7000-8071-1e7aa7e6ad91',
		value: 'electronics',
		label: 'Electronics',
	},
	{
		id: '019ba0f7-4282-7000-a420-10b30004144e',
		value: 'wearables',
		label: 'Wearables',
	},
	{
		id: '019ba0f7-58c7-7000-9522-f4241d527bf3',
		value: 'accessories',
		label: 'Accessories',
	},
	{
		id: '019ba0f7-7461-7000-b4ce-a6a0f35f1865',
		value: 'home-appliances',
		label: 'Home Appliances',
	},
] as const;

export type RaffleCategoryValue = (typeof RAFFLE_CATEGORIES)[number]['value'];

/**
 * Gets the human-readable label for a category ID
 */
export function getCategoryLabel(id?: string): string {
	if (!id) return 'Other';
	const category = RAFFLE_CATEGORIES.find(c => c.id === id);
	return category ? category.label : 'Other';
}

/**
 * Gets the backend UUID for a category slug/value
 */
export function getCategoryId(value: string): string | undefined {
	const category = RAFFLE_CATEGORIES.find(c => c.value === value);
	return category?.id;
}

/**
 * Gets the category value/slug from a category ID
 */
export function getCategoryValue(id: string): string | undefined {
	const category = RAFFLE_CATEGORIES.find(c => c.id === id);
	return category?.value;
}
