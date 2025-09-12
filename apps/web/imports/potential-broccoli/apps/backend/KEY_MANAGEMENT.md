# Key Management System Documentation

## Overview

The Key Management System provides a robust abstraction for managing cryptographic keys used in JWT token signing and verification. This system supports key rotation, local development key generation, and seamless integration with the existing authentication infrastructure.

## Features

- **Key Provider Interface**: Abstract interface for different key management strategies
- **Environment-based Key Management**: Production-ready key management with rotation support
- **Local Development Keys**: Ephemeral keys for development environments
- **Automatic Key Rotation**: Configurable time-based key rotation
- **Backward Compatibility**: Seamless fallback to static JWT secrets
- **Key Storage**: Secure key persistence for managed environments

## Architecture

### KeyProvider Interface

```javascript
class KeyProvider {
  async getActiveSigningKey()    // Get current active signing key
  async getKeyById(keyId)        // Get specific key for verification
  async rotateKeys()             // Rotate keys and generate new active key
  async getAllValidKeys()        // Get all valid keys (active + backup)
  async generateKey()            // Generate new cryptographic key
}
```

### Implementation Classes

#### EnvironmentKeyProvider
- **Default provider** for most environments
- Supports both static keys (backward compatibility) and managed keys
- Configurable key rotation intervals
- Secure key storage and retrieval

#### LocalDevelopmentKeyProvider
- **Development-specific** provider for local environments
- Generates ephemeral keys on initialization
- Shorter rotation intervals (1 hour default)
- No persistent storage (keys are temporary)

## Configuration

### Environment Variables

```bash
# Key Management Configuration
USE_MANAGED_KEYS=true                    # Enable managed key rotation
USE_LOCAL_DEV_KEYS=true                  # Use development keys (dev only)
KEY_ROTATION_INTERVAL_HOURS=24           # Key rotation interval (default: 24h)

# Backward Compatibility (fallback)
JWT_SECRET=your-static-secret            # Static JWT secret (fallback)
JWT_REFRESH_SECRET=your-refresh-secret   # Refresh token secret
```

### Key Management Modes

#### Static Key Mode (Default - Backward Compatible)
```bash
# No additional configuration needed
# Uses JWT_SECRET from environment
USE_MANAGED_KEYS=false  # or unset
```

#### Managed Keys Mode (Recommended for Production)
```bash
USE_MANAGED_KEYS=true
KEY_ROTATION_INTERVAL_HOURS=24
```

#### Local Development Mode
```bash
NODE_ENV=development
USE_LOCAL_DEV_KEYS=true
USE_MANAGED_KEYS=true
KEY_ROTATION_INTERVAL_HOURS=1
```

## API Endpoints

### Key Management Administration

All key management endpoints require admin authentication.

#### GET /api/v1/key-management/status
Get current key management status and statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "activeKeyId": "key-12345678-1234-1234-1234-123456789abc",
    "algorithm": "HS256",
    "totalKeys": 3,
    "keysByStatus": {
      "active": 1,
      "backup": 2
    },
    "managedKeysEnabled": true,
    "environment": "production"
  }
}
```

#### POST /api/v1/key-management/rotate
Trigger manual key rotation.

**Response:**
```json
{
  "success": true,
  "message": "Key rotation completed successfully",
  "data": {
    "newKeyId": "key-87654321-4321-4321-4321-210987654321",
    "previousKeyId": "key-12345678-1234-1234-1234-123456789abc",
    "rotatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### GET /api/v1/key-management/keys
List all valid keys (metadata only, no key material exposed).

**Response:**
```json
{
  "success": true,
  "data": {
    "keys": [
      {
        "keyId": "key-87654321-4321-4321-4321-210987654321",
        "algorithm": "HS256",
        "status": "active",
        "keyPreview": "dGhpc2lz..."
      },
      {
        "keyId": "key-12345678-1234-1234-1234-123456789abc",
        "algorithm": "HS256",
        "status": "backup",
        "keyPreview": "YW5vdGhl..."
      }
    ],
    "totalCount": 2
  }
}
```

#### POST /api/v1/key-management/generate-dev-keys
Generate development keys (development environment only).

**Response:**
```json
{
  "success": true,
  "message": "Development keys generated successfully",
  "data": {
    "keyId": "key-dev-12345678-1234-1234-1234-123456789abc",
    "algorithm": "HS256",
    "note": "These are ephemeral keys for development use only",
    "environment": "development"
  }
}
```

#### GET /api/v1/key-management/config
Get key management configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "managedKeysEnabled": true,
    "localDevKeysEnabled": false,
    "rotationIntervalHours": 24,
    "environment": "production",
    "jwtExpiresIn": "15m",
    "refreshExpiresIn": "7d"
  }
}
```

## Integration with Authentication

### Token Generation

The AuthService automatically uses the KeyProvider for token generation:

```javascript
// Enhanced token generation
const tokens = await AuthService.generateTokens(user);
// Tokens are signed with current active key
// KeyId is included in JWT header for verification
```

### Token Verification

The authentication middleware supports multiple key verification:

```javascript
// Automatic key resolution during token verification
app.use(authenticateToken);
// Supports tokens signed with:
// - Current active key
// - Previous backup keys (during rotation)
// - Static keys (fallback compatibility)
```

### Key Rotation Handling

During key rotation:
1. New active key is generated
2. Previous active key becomes backup
3. Existing tokens remain valid (signed with backup keys)
4. New tokens use the new active key
5. Old backup keys are cleaned up (keep 3 most recent)

## Security Considerations

### Key Security
- **256-bit keys**: All generated keys are 256-bit cryptographically secure
- **Secure random generation**: Uses Node.js crypto.randomBytes()
- **No key exposure**: API endpoints never expose actual key material
- **Key rotation**: Regular rotation minimizes key exposure risk

### Storage Security
- **Local file storage**: Keys stored in `.keys` file (ensure proper file permissions)
- **No plaintext logging**: Key material never logged in plaintext
- **Graceful degradation**: Falls back to static keys if KeyProvider fails

### Access Control
- **Admin-only endpoints**: All key management operations require admin role
- **Audit logging**: All key operations are logged for security auditing
- **Rate limiting**: Key rotation operations are rate-limited

## Operational Procedures

### Initial Setup

1. **Enable managed keys** in your environment:
   ```bash
   export USE_MANAGED_KEYS=true
   export KEY_ROTATION_INTERVAL_HOURS=24
   ```

2. **Start your application** - keys will be generated automatically on first run

3. **Verify key status**:
   ```bash
   curl -H "Authorization: Bearer <admin-token>" \
        http://localhost:5000/api/v1/key-management/status
   ```

### Key Rotation

#### Automatic Rotation
Keys rotate automatically based on `KEY_ROTATION_INTERVAL_HOURS`.

#### Manual Rotation
```bash
curl -X POST \
     -H "Authorization: Bearer <admin-token>" \
     http://localhost:5000/api/v1/key-management/rotate
```

### Monitoring

#### Key Status Monitoring
```bash
# Check current key status
curl -H "Authorization: Bearer <admin-token>" \
     http://localhost:5000/api/v1/key-management/status

# Monitor key rotation events in logs
tail -f logs/combined.log | grep "KEYS_ROTATED"
```

#### Security Event Monitoring
Monitor these security events in your logs:
- `KEY_PROVIDER_INITIALIZED`
- `KEYS_ROTATED`
- `KEY_GENERATED`
- `OLD_KEY_REMOVED`
- `TOKEN_VERIFIED`

### Troubleshooting

#### Common Issues

**Key Provider Initialization Fails**
```bash
# Check logs for initialization errors
grep "KeyProvider" logs/error.log

# Verify environment configuration
echo $USE_MANAGED_KEYS
echo $KEY_ROTATION_INTERVAL_HOURS
```

**Token Verification Fails After Key Rotation**
- Check if old backup keys are available
- Verify token was signed with known key
- Check authentication logs for key resolution attempts

**Permission Errors with Key Storage**
```bash
# Ensure proper permissions for key storage
chmod 600 .keys
chown app:app .keys
```

#### Fallback Recovery

If managed keys fail, the system automatically falls back to static JWT secrets:

```bash
# Disable managed keys temporarily
export USE_MANAGED_KEYS=false

# Ensure fallback secret is set
export JWT_SECRET=your-fallback-secret

# Restart application
```

## Development Guide

### Local Development Setup

1. **Enable development keys**:
   ```bash
   export NODE_ENV=development
   export USE_LOCAL_DEV_KEYS=true
   export USE_MANAGED_KEYS=true
   ```

2. **Generate development keys**:
   ```bash
   curl -X POST http://localhost:5000/api/v1/key-management/generate-dev-keys
   ```

3. **Keys are ephemeral** - regenerated on each application restart

### Testing Key Rotation

```javascript
// Test key rotation in development
const { getKeyProvider } = require('./src/services/keyProvider');

async function testRotation() {
  const keyProvider = getKeyProvider();
  
  const beforeRotation = await keyProvider.getActiveSigningKey();
  console.log('Before rotation:', beforeRotation.keyId);
  
  const result = await keyProvider.rotateKeys();
  console.log('Rotation result:', result);
  
  const afterRotation = await keyProvider.getActiveSigningKey();
  console.log('After rotation:', afterRotation.keyId);
}

testRotation();
```

## Migration Guide

### From Static Keys to Managed Keys

1. **Current setup with static keys**:
   ```bash
   JWT_SECRET=your-current-secret
   ```

2. **Enable managed keys gradually**:
   ```bash
   # Keep existing secret as fallback
   JWT_SECRET=your-current-secret
   
   # Enable managed keys
   USE_MANAGED_KEYS=true
   KEY_ROTATION_INTERVAL_HOURS=168  # Start with weekly rotation
   ```

3. **Deploy and verify**:
   - Existing tokens continue to work (fallback to static secret)
   - New tokens use managed keys
   - Monitor logs for successful key generation

4. **Complete migration** (after confidence period):
   ```bash
   # Remove static secret (optional)
   # unset JWT_SECRET
   
   # Reduce rotation interval if desired
   KEY_ROTATION_INTERVAL_HOURS=24
   ```

### Zero-Downtime Deployment

The key management system is designed for zero-downtime deployments:
1. New deployments automatically load existing keys
2. Key rotation doesn't invalidate existing sessions
3. Fallback mechanisms ensure service continuity

## Best Practices

### Production Deployment
- Use managed keys with 24-hour rotation
- Monitor key rotation events
- Set up alerts for key management failures
- Ensure proper backup and disaster recovery

### Security Hardening
- Restrict access to key management endpoints
- Monitor failed key operations
- Use proper file permissions for key storage
- Implement network-level access controls

### Performance Optimization
- Cache KeyProvider instance (singleton pattern used)
- Monitor key lookup performance
- Use appropriate rotation intervals (balance security vs performance)

## Changelog

### Version 1.0.0 (Phase 1b - Epic #34)
- Initial KeyProvider interface implementation
- EnvironmentKeyProvider with managed and static key support
- LocalDevelopmentKeyProvider for development environments
- Key rotation abstraction and automation
- Integration with existing AuthService
- Administrative API endpoints
- Comprehensive negative path testing
- Complete documentation and operational procedures