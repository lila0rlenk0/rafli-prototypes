/** @type {import('prettier').Config} */
const config = {
	singleQuote: true,
	useTabs: true,
	arrowParens: 'avoid',
	plugins: ['prettier-plugin-tailwindcss'],
	quoteProps: 'as-needed',
};

export default config;
