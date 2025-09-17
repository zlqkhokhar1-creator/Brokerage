# 🏗️ Brokerage Platform Architecture

## Overview

This document outlines the architecture of the brokerage platform, focusing on security, scalability, and maintainability. The platform is built as a monorepo with multiple services designed to support high-frequency trading, portfolio management, and compliance requirements.

## 🔒 Security & Identity Foundation (Phase 1)

### Architecture Overview

The Security & Identity Foundation provides a secure, type-safe configuration and authentication scaffold that all backend services can reuse. This foundation establishes trust boundaries, validates configurations early, and provides centralized JWT token management.

```mermaid
graph TB
    Client[Client Applications] --> Gateway[Gateway Service]
    Gateway --> Config[Configuration Module]
    Gateway --> Security[Security Module]
    Gateway --> Health[Health Endpoints]
    
    Config --> Env[Environment Validation]
    Config --> Zod[Zod Schema Validation]
    
    Security --> JWT[JWT Service]
    Security --> Keys[Key Management]
    Security --> Middleware[Auth Middleware]
    
    JWT --> RS256[RS256 Algorithm]
    JWT --> HS256[HS256 Algorithm]
    
    Keys --> EnvKeys[Environment Keys]
    Keys --> FileKeys[File-based Keys]
    Keys --> KMS[KMS Integration*]
    
    Gateway --> Logs[Enhanced Logging]
    Logs --> Redaction[Sensitive Data Redaction]
```

### Configuration System

The configuration module provides type-safe environment variable validation using Zod schemas.

#### Key Features:
- **Fail-fast validation**: Application won't start with missing/invalid environment variables
- **Type safety**: All configuration values are properly typed and validated
- **Algorithm flexibility**: Supports both RS256 (recommended) and HS256 algorithms
- **Clear error messages**: Detailed validation errors for missing or malformed variables

#### Configuration Flow:
```mermaid
sequenceDiagram
    participant App as Application
    participant Config as Config Module
    participant Zod as Zod Validator
    participant Env as Environment
    
    App->>Config: getConfig()
    Config->>Env: Load environment variables
    Env-->>Config: Raw values
    Config->>Zod: Validate schema
    alt Valid Configuration
        Zod-->>Config: Validated config
        Config-->>App: Type-safe config object
    else Invalid Configuration
        Zod-->>Config: Validation errors
        Config-->>App: Detailed error message
        App->>App: process.exit(1)
    end
```

#### Required Environment Variables:
- `JWT_ISSUER` - JWT token issuer (e.g., "brokerage-api")
- `JWT_AUDIENCE` - JWT token audience (e.g., "brokerage-web")
- `JWT_ACCESS_TTL` - Access token TTL (e.g., "15m")
- `JWT_REFRESH_TTL` - Refresh token TTL (e.g., "7d")
- `JWT_ALG` - JWT algorithm ("RS256" or "HS256")
- Algorithm-specific keys/secrets (see JWT Trust Model below)

### JWT Trust Model

The platform supports two JWT signing algorithms with different security profiles:

#### RS256 (Recommended for Production)
```mermaid
graph LR
    PrivateKey[Private Key<br/>JWT_PRIVATE_KEY] --> Sign[Token Signing]
    PublicKey[Public Key<br/>JWT_PUBLIC_KEY] --> Verify[Token Verification]
    Sign --> AccessToken[Access Token]
    Sign --> RefreshToken[Refresh Token]
    AccessToken --> Verify
    RefreshToken --> Verify
```

**Benefits:**
- **Asymmetric security**: Public key can be shared safely
- **Key rotation**: Private key rotation doesn't affect verification
- **Distributed verification**: Multiple services can verify with public key
- **Industry standard**: Widely supported and battle-tested

**Configuration:**
```bash
# Option 1: Direct PEM in environment (escape newlines as \n)
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

# Option 2: File paths
JWT_PRIVATE_KEY_PATH="./keys/jwt-private.pem"
JWT_PUBLIC_KEY_PATH="./keys/jwt-public.pem"
```

#### HS256 (Development/Testing)
```mermaid
graph LR
    Secret[Shared Secret<br/>JWT_SECRET] --> Sign[Token Signing]
    Secret --> Verify[Token Verification]
    RefreshSecret[Refresh Secret<br/>JWT_REFRESH_SECRET] --> SignRefresh[Refresh Token Signing]
    RefreshSecret --> VerifyRefresh[Refresh Token Verification]
```

**Benefits:**
- **Simplicity**: Single shared secret for signing and verification
- **Performance**: Slightly faster than RSA operations
- **Development friendly**: Easy to set up for local development

**Configuration:**
```bash
JWT_SECRET="your-super-secret-jwt-key-change-in-production-min-32-chars"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production-min-32-chars"
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant JWT as JWT Service
    participant Middleware
    participant Resource
    
    Client->>Gateway: Request with Authorization header
    Gateway->>Middleware: Process request
    Middleware->>JWT: Extract token
    JWT->>JWT: Verify signature & claims
    
    alt Valid Token
        JWT-->>Middleware: Decoded claims
        Middleware->>Middleware: Attach user context
        Middleware->>Resource: Forward request
        Resource-->>Client: Protected resource
    else Invalid Token
        JWT-->>Middleware: Validation error
        Middleware-->>Client: 401 Unauthorized
    end
```

### Key Management Strategy

The platform provides a flexible key management abstraction:

#### Current Implementation (Phase 1):
1. **Environment Variables**: Direct PEM keys in environment
2. **File System**: Keys loaded from specified file paths
3. **Test Keys**: RSA key pairs for development and testing

#### Future Roadmap (Phase 2+):
1. **AWS KMS Integration**: Hardware security modules for key storage
2. **HashiCorp Vault**: Centralized secret management
3. **Key Rotation**: Automated key rotation with zero-downtime
4. **Multiple Key Support**: Key versioning and rollover

### HTTP Middleware Architecture

The authentication middleware provides three layers of protection:

#### 1. Required JWT Middleware
- **Purpose**: Protects sensitive endpoints requiring authentication
- **Behavior**: Returns 401 if token is missing/invalid
- **Use Case**: Trading operations, portfolio access, account management

#### 2. Optional JWT Middleware  
- **Purpose**: Enhances requests with user context when available
- **Behavior**: Continues without auth if token is missing/invalid
- **Use Case**: Public endpoints that may show personalized content

#### 3. Role-based Authorization
- **Purpose**: Enforces fine-grained access control
- **Behavior**: Checks user roles against required permissions
- **Use Case**: Admin operations, privileged trading features

```javascript
// Example: Protect admin-only endpoint
app.get('/admin/users', 
  jwtMiddleware,                           // Require authentication
  authorize(['admin', 'support']),         // Require specific roles
  getUsersHandler
);

// Example: Mixed public/private endpoint
app.get('/market-data',
  optionalJwtMiddleware,                   // Optional authentication
  getMarketDataHandler                     // May show personalized data
);
```

### Enhanced Logging & Security

#### Sensitive Data Redaction
The logging system automatically redacts sensitive information:

- **Authorization headers**: `Bearer [REDACTED]`
- **JWT tokens**: `[REDACTED-{length}]`
- **API keys**: `[REDACTED]`
- **Passwords/secrets**: `[REDACTED]`

#### Security Event Logging
All authentication attempts are logged with appropriate detail levels:

```javascript
// Successful authentication
logger.debug('JWT authentication successful', {
  userId: 'user123',
  roles: ['trader'],
  sessionId: 'session456',
  ip: '192.168.1.100'
});

// Failed authentication
logger.warn('JWT authentication failed', {
  error: 'Token has expired',
  ip: '192.168.1.100',
  path: '/api/trading/orders',
  authHeader: 'Bearer [REDACTED]'
});
```

## 🚀 Service Endpoints

### Health & Monitoring

#### `/healthz` (No Authentication)
System health check with configuration validation status:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "brokerage-gateway",
  "version": "1.0.0",
  "environment": "production",
  "uptime": 3600,
  "configuration": {
    "jwtAlgorithm": "RS256",
    "jwtIssuer": "brokerage-api",
    "httpPort": 3000,
    "logLevel": "info",
    "hasJwtKeys": true,
    "hasJwtSecrets": false
  }
}
```

#### `/whoami` (JWT Authentication Required)
Returns authenticated user information:

```json
{
  "userId": "user123",
  "email": "trader@example.com",
  "roles": ["user", "trader"],
  "sessionId": "session-456",
  "tokenInfo": {
    "issuedAt": "2024-01-15T10:00:00.000Z",
    "expiresAt": "2024-01-15T10:15:00.000Z",
    "algorithm": "RS256",
    "issuer": "brokerage-api",
    "audience": "brokerage-web"
  },
  "authenticated": true,
  "timestamp": "2024-01-15T10:05:00.000Z"
}
```

## 🔮 Security Roadmap

### Phase 2: Advanced Authentication
- **OIDC Integration**: Support for external identity providers
- **Multi-factor Authentication**: TOTP, SMS, hardware tokens
- **Session Management**: Advanced session controls and monitoring
- **API Key Management**: Service-to-service authentication

### Phase 3: Authorization & Compliance  
- **RBAC Policy Engine**: Fine-grained role and permission management
- **Audit Logging**: Comprehensive audit trail for compliance
- **Rate Limiting**: Advanced rate limiting and DDoS protection
- **Anomaly Detection**: ML-based suspicious activity detection

### Phase 4: Enterprise Features
- **Single Sign-On (SSO)**: SAML and OIDC federation
- **Certificate Management**: mTLS and certificate-based authentication
- **Secrets Management**: Integration with enterprise secret managers
- **Compliance Frameworks**: SOC2, PCI DSS, ISO 27001 compliance

## 🛠️ Development & Testing

### Local Development Setup
```bash
# 1. Copy environment template
cp .env.example .env

# 2. Configure required variables
nano .env

# 3. Generate test JWT
node scripts/generate-test-jwt.js

# 4. Start development server
npm run dev
```

### Testing Endpoints
```bash
# Test health endpoint
curl -X GET http://localhost:3000/healthz

# Test authentication with generated token
curl -X GET http://localhost:3000/whoami \
     -H "Authorization: Bearer {your-jwt-token}"

# Test without token (should return 401)
curl -X GET http://localhost:3000/whoami
```

### Running Tests
```bash
# Run all tests
npm test

# Run security-specific tests
npm test -- --testPathPattern="(config|security|middleware)"

# Run with coverage
npm test -- --coverage
```

## 📊 Performance Considerations

### JWT Token Size
- **Access tokens**: ~400-800 bytes (with typical claims)
- **Refresh tokens**: ~200-400 bytes (minimal claims)
- **Recommendation**: Keep custom claims minimal to reduce token size

### Caching Strategy
- **JWT verification**: Keys cached in memory after first load
- **User context**: Consider Redis caching for frequently accessed user data
- **Configuration**: Cached after first validation, reset only on restart

### Scalability Notes
- **Stateless design**: JWT tokens enable horizontal scaling
- **Key distribution**: Public keys can be shared across service instances
- **Session storage**: Refresh tokens may require persistent storage for rotation

## 🔧 Troubleshooting

### Common Configuration Errors
```bash
# Missing required environment variables
❌ Configuration validation failed:
JWT_ISSUER: Required
JWT_AUDIENCE: Required

# Invalid TTL format
❌ JWT_ACCESS_TTL must be in format like "15m", "1h", "7d"

# Missing keys for RS256
❌ JWT_PRIVATE_KEY or JWT_PRIVATE_KEY_PATH is required when JWT_ALG is RS256
```

### Authentication Debugging
```bash
# Check token structure
echo "your-jwt-token" | cut -d. -f2 | base64 -d | jq

# Verify token expiration
node -e "console.log(new Date(JSON.parse(Buffer.from('payload-part', 'base64')).exp * 1000))"

# Test token generation
node scripts/generate-test-jwt.js
```
