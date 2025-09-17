# Membership Block Architecture

The membership block (`packages/blocks/membership`) handles user authentication, profile management, and JWT token operations in a secure, event-driven manner.

## Core Concepts

### Identity Model
- **User Entity**: Core user record with profile data, authentication credentials, and metadata
- **Schema Versioning**: All user records include a version field for future migration support
- **Email-based Identity**: Primary identification via email address with unique constraints
- **Profile Flexibility**: Optional profile fields support progressive user onboarding

### Authentication Strategy
- **Password Hashing**: Argon2id preferred (with bcrypt fallback) using configurable parameters
- **JWT Access Tokens**: Short-lived tokens (15min default) with issuer verification
- **Refresh Tokens**: Opaque random tokens for session extension (TODO: persistent storage)
- **Key Rotation**: Automated JWT signing key rotation with grace period support

### JWT Implementation
- **Algorithm**: HS256 initially with RS256 migration structure ready
- **Claims Structure**:
  - `iss`: Issuer (configurable, default: 'brokerage-platform')
  - `sub`: User ID
  - `iat`: Issued at timestamp
  - `exp`: Expiration timestamp
  - `kid`: Key ID for rotation support
  - `email`: User email for convenience

### Key Management
- **Key Ring**: In-memory key storage with metadata persistence
- **Rotation Strategy**: Time-based rotation (24hr default) with manual trigger capability
- **Development Mode**: Keys stored in `artifacts/runtime/keys/metadata.json`
- **Production TODO**: KMS/HSM integration for secure key storage

### JWKS Exposure
- **Endpoint**: `/internal/jwks.json` (gateway-proxied)
- **Purpose**: Public key exposure for verification (RS256 future-ready)
- **Security**: Symmetric keys (HS256) not exposed, structure maintained for migration

## Command Architecture

### Commands Implemented
1. **RegisterUser**: Create new user with email/password
2. **AuthenticateUser**: Login with email/password, return tokens
3. **GetProfile**: Retrieve user profile by ID
4. **UpdateProfile**: Update profile fields with versioning
5. **ValidateToken**: Internal token verification (testing/internal routes)

### Command Pattern
- **Validation**: Zod schema validation for all inputs
- **Error Handling**: Sanitized logging (never log passwords/hashes)
- **Tracing**: Optional trace ID propagation for correlation
- **Events**: Automatic event emission on state changes

## Event Taxonomy

### Event Types
- `user.registered.v1`: New user creation
- `user.profile.updated.v1`: Profile modifications
- `user.authenticated.v1`: Successful login attempts

### Event Structure
```typescript
{
  type: 'user.registered.v1',
  userId: string,
  email: string,
  createdAt: string,
  traceId?: string
}
```

### Event Processing
- **In-Memory**: EventEmitter-based for development
- **Production TODO**: Redis Streams, RabbitMQ, or similar message queue
- **Logging**: All events logged with structured format
- **Handlers**: Pluggable event handler registration

## Security Considerations

### Password Security
- **Complexity**: Zod refinement with configurable minimum requirements
- **Hashing**: Argon2id with recommended parameters (3 iterations, 64MB memory, 4 threads)
- **Migration**: Automatic rehashing from bcrypt to Argon2id during login
- **Environment**: Configurable via environment variables

### JWT Security
- **Token Lifetime**: Short access token TTL (15min) forces frequent renewal
- **Key Rotation**: Regular rotation prevents key compromise impact
- **Claims Validation**: Issuer, expiration, and key ID validation
- **Refresh Security**: Opaque refresh tokens prevent token prediction

### Audit & Monitoring
- **Authentication Attempts**: All attempts logged with success/failure
- **Failed Logins**: Rate limiting ready (TODO: implement with Redis)
- **Key Operations**: Key generation/rotation fully audited
- **Data Redaction**: Sensitive fields redacted in all logs

## Repository Abstraction

### Current Implementation
- **InMemoryUserRepository**: Development/testing implementation
- **Interface**: `UserRepository` for future persistence layers

### Production Migration Path
- **PostgreSQL**: Schema-ready with user table design
- **Migrations**: Version field enables progressive schema updates
- **Indexing**: Email uniqueness, user ID performance optimization
- **Connection Pooling**: Generic pool interface ready

## Configuration

### Environment Variables
```bash
# JWT Configuration
JWT_ISSUER=brokerage-platform
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=604800
JWT_KEY_ROTATION=86400

# Password Configuration  
PASSWORD_MIN_LENGTH=8
USE_ARGON2=true
ARGON2_TIME_COST=3
ARGON2_MEMORY_COST=65536
ARGON2_PARALLELISM=4
```

### Runtime Configuration
```typescript
const config = {
  password: {
    useArgon2: true,
    argon2: { timeCost: 3, memoryCost: 65536, parallelism: 4 }
  },
  jwt: {
    issuer: 'brokerage-platform',
    accessTokenTTL: 900,
    algorithm: 'HS256'
  }
};
```

## Integration Points

### Gateway Integration
- **Command Routing**: Commands exposed via API gateway
- **Authentication Middleware**: JWT verification for protected routes
- **JWKS Endpoint**: Public key exposure for verification

### Cross-Block Dependencies
- **Platform Security**: Provides AuthVerifier implementation
- **Legacy Adapter**: Backward compatibility for existing APIs
- **Payment Gateway**: User context for payment operations

## Performance Characteristics

### Memory Usage
- **Users**: ~1KB per user (estimated)
- **Keys**: ~500B per key with metadata
- **Events**: Configurable retention (memory-based development mode)

### Scalability Considerations
- **Horizontal**: Stateless design ready for multiple instances
- **Key Sync**: TODO - distributed key management for multi-instance
- **Event Distribution**: TODO - shared event bus for consistency

## Testing Strategy

### Unit Testing
- Password hashing service validation
- JWT token generation/verification
- Repository CRUD operations
- Command validation and execution

### Integration Testing
- Complete authentication flow (register → login → protected operation)
- Key rotation scenarios
- Event emission verification
- Error handling paths

### Security Testing
- Password complexity validation
- Token expiration handling
- Key rotation grace periods
- Authentication bypass attempts

## Future Enhancements

### Phase 4 Planned Features
- **RS256 Migration**: Asymmetric key support with real JWKS
- **Persistent Storage**: PostgreSQL user repository
- **Redis Integration**: Refresh token storage, rate limiting
- **Advanced Security**: MFA support, device tracking
- **Performance**: Connection pooling, query optimization

### Monitoring Integration
- **Metrics**: Authentication rates, token validation performance
- **Alerts**: Failed login spikes, key rotation failures
- **Dashboards**: User growth, authentication patterns