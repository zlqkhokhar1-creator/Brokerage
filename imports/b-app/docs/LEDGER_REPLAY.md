# Ledger Replay and Verification

This document describes the ledger replay and verification system that ensures balance consistency and provides audit capabilities for the financial ledger.

## Overview

The ledger replay system provides tools to verify the integrity of financial data by recalculating balances from the complete transaction history and comparing them against stored balances.

## Components

### 1. LedgerReplayVerifier Class

The core verification engine that processes transactions and validates balance consistency.

**Location:** `apps/backend/scripts/ledger_replay_verify.ts`

### 2. CLI Script

Command-line interface for running verification and replay operations.

**Usage:** `npm run ledger:replay [command] [options]`

### 3. Balance Consistency Checks

Automated verification that compares calculated vs. stored balances.

## Commands

### Verify (Default)

Verifies balance consistency without making changes:

```bash
# Basic verification
npm run ledger:replay verify

# JSON output for automation
npm run ledger:replay verify --json

# TypeScript execution
ts-node scripts/ledger_replay_verify.ts verify
```

**Output Example:**
```json
{
  "status": "PASS",
  "summary": {
    "totalTransactions": 1523,
    "totalBalances": 45,
    "consistentBalances": 45,
    "inconsistentBalances": 0,
    "errors": []
  }
}
```

### Replay

Rebuilds all balances from transaction history:

```bash
# Dry run (default - shows what would happen)
npm run ledger:replay replay

# Execute actual replay (DESTRUCTIVE)
npm run ledger:replay replay --execute

# JSON output
npm run ledger:replay replay --json
```

**⚠️ WARNING:** The `--execute` flag will clear and rebuild all ledger balances. Ensure database is backed up before running.

**Output Example:**
```json
{
  "success": true,
  "processedTransactions": 1523,
  "errors": []
}
```

### Summary

Generates comprehensive ledger summary report:

```bash
# Generate summary
npm run ledger:replay summary
```

**Output Example:**
```json
{
  "balanceSummary": [
    {
      "entity_type": "user",
      "currency": "USD", 
      "entity_count": 25,
      "total_balance": "50000",
      "min_balance": "0",
      "max_balance": "5000"
    }
  ],
  "transactionSummary": [
    {
      "entity_type": "user",
      "currency": "USD",
      "direction": "credit",
      "transaction_count": 150,
      "total_amount": "75000"
    }
  ],
  "generatedAt": "2024-01-15T10:30:00.000Z"
}
```

## Balance Verification Process

### 1. Transaction Processing

The verifier processes transactions in chronological order:

```typescript
// Get transactions ordered by creation time
const transactions = await kysely
  .selectFrom('ledger_transactions')
  .selectAll()
  .orderBy('created_at', 'asc')
  .execute();
```

### 2. Balance Calculation

For each entity/currency combination:

```typescript
// Calculate balance from all transactions
const calculatedBalance = transactions
  .filter(tx => tx.entity_id === entityId && tx.currency === currency)
  .reduce((balance, tx) => {
    return tx.direction === 'credit' 
      ? balance + BigInt(tx.amount_minor)
      : balance - BigInt(tx.amount_minor);
  }, BigInt(0));
```

### 3. Consistency Check

Compare calculated vs. stored balances:

```typescript
const verification = {
  storedBalance: await ledgerRepo.getBalance(entityType, entityId, currency),
  calculatedBalance,
  isConsistent: storedBalance === calculatedBalance,
  transactionCount: relevantTransactions.length
};
```

### 4. Inconsistency Reporting

When inconsistencies are found:

```json
{
  "status": "FAIL",
  "details": {
    "inconsistencies": [
      {
        "entityType": "user",
        "entityId": "123e4567-e89b-12d3-a456-426614174000",
        "currency": "USD",
        "storedBalance": "10000",
        "calculatedBalance": "9500", 
        "difference": "500"
      }
    ]
  }
}
```

## Use Cases

### 1. Regular Integrity Checks

Run daily/weekly verification as part of operations:

```bash
# Automated verification in CI/CD
npm run ledger:replay verify --json > ledger_verification.json
```

### 2. Debugging Balance Issues

When users report incorrect balances:

```bash
# Check specific user balance
npm run ledger:replay verify --json | jq '.details.inconsistencies[] | select(.entityId == "user-id")'
```

### 3. Data Migration Validation

After migrating from legacy systems:

```bash
# Verify all balances after migration
npm run ledger:replay verify
```

### 4. Disaster Recovery

After database corruption or restoration:

```bash
# Backup current state
pg_dump database > pre_replay_backup.sql

# Replay all transactions
npm run ledger:replay replay --execute

# Verify integrity
npm run ledger:replay verify
```

## Performance Considerations

### Batch Processing

Large transaction volumes are processed in batches:

```typescript
const batchSize = 1000;
let offset = 0;

while (hasMore) {
  const transactions = await kysely
    .selectFrom('ledger_transactions')
    .orderBy('created_at', 'asc')
    .limit(batchSize)
    .offset(offset)
    .execute();
  
  // Process batch...
  offset += batchSize;
}
```

### Database Impact

- Read-heavy operations during verification
- Write-intensive during replay
- Consider running during low-traffic periods
- Use read replicas when available

## Best Practices

### Operational Guidelines

1. **Always backup before replay operations**
2. **Test in staging environment first**
3. **Run verification regularly (daily recommended)**
4. **Monitor performance trends over time**
5. **Document any inconsistencies found**

### Development Guidelines

1. **Use transactions for multi-step ledger operations**
2. **Validate balance changes in application code**
3. **Add comprehensive logging for ledger operations**
4. **Test replay functionality with sample data**
5. **Consider replay impact during schema changes**