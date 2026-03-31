'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const BACK_BUTTON_ID = 'mobile-back-btn';

/**
 * Injects a back arrow button into the navbar DOM on mobile.
 * Inserts before the logo with 8px gap. Cleans up on unmount.
 * Hidden on desktop where BackLink text is shown.
 *
 * @returns null (renders via DOM injection, not React tree)
 */
export function MobileBackButton() {
	const router = useRouter();

	useEffect(() => {
		if (window.innerWidth >= 1024) return;

		const nav = document.querySelector('nav');
		const leftContent = nav?.querySelector('div > div') as HTMLElement | null;
		if (!leftContent) return;

		// Don't double-inject
		if (document.getElementById(BACK_BUTTON_ID)) return;

		const btn = document.createElement('button');
		btn.id = BACK_BUTTON_ID;
		btn.setAttribute('aria-label', 'Go back');
		btn.style.display = 'flex';
		btn.style.alignItems = 'center';
		btn.style.cursor = 'pointer';
		btn.style.marginRight = '8px';
		btn.style.flexShrink = '0';
		btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M12 19L5 12L12 5" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			<path d="M19 12H5" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>`;

		btn.addEventListener('click', handleClick);
		leftContent.insertBefore(btn, leftContent.firstChild);

		function handleClick() {
			if (document.referrer) {
				try {
					const isSameOrigin =
						new URL(document.referrer).origin === window.location.origin;
					if (isSameOrigin) {
						window.history.back();
						return;
					}
				} catch {
					// invalid referrer URL
				}
			}
			router.push('/browse');
		}

		return () => {
			btn.removeEventListener('click', handleClick);
			btn.remove();
		};
	}, [router]);

	return null;
}
