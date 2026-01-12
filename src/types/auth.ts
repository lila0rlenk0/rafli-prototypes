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
