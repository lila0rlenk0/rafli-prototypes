export interface AuthUser {
	id: string;
	email: string;
	emailVerified: boolean;
	name: string;
	image?: string | null;
	permissions?: string[];
}

export interface AuthSession {
	user: AuthUser;
	token: string;
	expiresAt: string;
}

export interface SignInInput {
	email: string;
	password: string;
}

export interface SignUpInput {
	email: string;
	password: string;
	name: string;
}

export interface UpdateProfileInput {
	name?: string;
	bio?: string;
	username?: string;
}

/**
 * Supported social login providers
 */
export type SocialProvider = 'google';

/**
 * Input for initiating social sign-in
 */
export interface SocialSignInInput {
	provider: SocialProvider;
	callbackURL?: string;
}

/**
 * Response from social sign-in initiation
 */
export interface SocialSignInResponse {
	redirect: boolean;
	url: string;
}
