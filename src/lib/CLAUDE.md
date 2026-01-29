# Lib Layer

Infrastructure utilities: API clients, error handling, auth, caching, analytics.

## Directory Structure

```
lib/
├── api/        # HTTP clients (baseClient, authenticatedClient)
├── auth/       # Session management, JWT utilities
├── cache/      # Revalidation helpers
├── errors/     # Error types, mappers, helpers
├── analytics/  # Mixpanel integration
├── utils/      # General utilities (date formatting, etc.)
└── utils.ts    # Tailwind cn() helper
```

## Golden Rules

ALWAYS: Use `ServiceResponse<T, E>` for service returns
ALWAYS: Map errors through domain-specific mappers
ALWAYS: Use typed error codes, never throw raw errors
NEVER: Expose implementation details to consuming layers

## ServiceResponse Pattern

All services return discriminated unions for type-safe error handling:

```typescript
type ServiceResponse<T, E> =
	| { success: true; data: T }
	| { success: false; error: E };
```

## How To: Return from Services

```typescript
import { success, failure } from '@/lib/errors';

// Success with data
return success(data);

// Success without data (void operations)
return success(undefined);

// Failure with typed error
return failure(ERROR_CODES.NOT_FOUND);
return failure(mapAuthError(error));
```

## How To: Handle Errors in Components

```typescript
function getErrorMessage(code: AuthErrorCode): string {
	switch (code) {
		case AUTH_ERROR_CODES.INVALID_CREDENTIALS:
			return 'Invalid email or password.';
		case 'network_error':
			return 'Network error. Check connection.';
		default:
			return 'An unexpected error occurred.';
	}
}

// Usage
const result = await signIn(data);
if (!result.success) {
	setError('root', { message: getErrorMessage(result.error) });
	return;
}
// TypeScript knows result.data exists
```

## Error Mappers

Domain-specific mappers convert API errors to typed codes:

| Mapper           | Domain                  |
| ---------------- | ----------------------- |
| `mapAuthError`   | Authentication services |
| `mapRaffleError` | Raffle services         |

Auto-maps HTTP status and network errors:

- 401 → `unauthorized`
- 403 → `forbidden`
- 500 → `internal_server_error`
- `ECONNABORTED` → `timeout_error`
- `ERR_NETWORK` → `network_error`

## Error Code Naming

Format: `<service>:<operation>:<specific>`

Examples:

- `auth:sign-in:invalid-credentials`
- `raffle:create:permission`
- `raffle:upload:too-large`

## API Clients

| Client                | Use Case                                       |
| --------------------- | ---------------------------------------------- |
| `baseClient`          | Public endpoints (no auth)                     |
| `authenticatedClient` | Protected endpoints (reads token from cookies) |

Both auto-inject: S2S secret header, client IP forwarding.

Located in `@/lib/api/client`.
