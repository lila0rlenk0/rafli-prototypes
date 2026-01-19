# Lib Layer

Utilities, error handling, and API client configuration.

## Error Handling System

All services return typed `ServiceResponse<TData, TErrorCode>`:

```typescript
type ServiceResponse<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };
```

## Helpers

```typescript
import { success, failure } from '@/lib/errors';

// Success cases
return success(data);           // with data
return success(undefined);      // void operations

// Failure cases
return failure(ERROR_CODES.NOT_FOUND);
return failure(mapAuthError(error));
```

## Error Mappers

- `mapAuthError(error)` - auth service errors
- `mapRaffleError(error)` - raffle service errors

Auto-maps backend codes and HTTP status:
- 401 → `unauthorized`
- 403 → `forbidden`
- 500 → `internal_server_error`
- `ECONNABORTED` → `timeout_error`
- `ERR_NETWORK` → `network_error`

## Component Error Handling

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

## Error Code Naming

Format: `<service>:<operation>:<specific>`

Examples:
- `auth:sign-in:invalid-credentials`
- `raffle:create:permission`
- `raffle:upload:too-large`

## API Clients

- `baseClient` - no auth, injects S2S secret + client IP
- `authenticatedClient` - injects token from cookies + S2S secret + client IP

Located in `@/lib/api/client`.
