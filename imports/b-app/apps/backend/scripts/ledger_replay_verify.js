"use strict";
/**
 * Ledger Replay and Verification Script
 * Recalculates balances from transactions and verifies against stored balances
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerReplayVerifier = void 0;
const kysely_1 = require("../src/config/kysely");
const LedgerRepository_1 = require("../src/repositories/LedgerRepository");
class LedgerReplayVerifier {
    ledgerRepo = new LedgerRepository_1.LedgerRepository();
    /**
     * Run full ledger verification
     */
    async verifyLedger() {
        const result = {
            status: 'PASS',
            summary: {
                totalTransactions: 0,
                totalBalances: 0,
                consistentBalances: 0,
                inconsistentBalances: 0,
                errors: []
            },
            details: {
                inconsistencies: []
            }
        };
        try {
            // Get total transaction count
            const transactionCountResult = await kysely_1.kysely
                .selectFrom('ledger_transactions')
                .select(kysely_1.kysely.fn.count('id').as('count'))
                .executeTakeFirstOrThrow();
            result.summary.totalTransactions = Number(transactionCountResult.count);
            // Get all balances to verify
            const balances = await kysely_1.kysely
                .selectFrom('ledger_balances')
                .selectAll()
                .execute();
            result.summary.totalBalances = balances.length;
            console.log(`Verifying ${balances.length} balances against ${result.summary.totalTransactions} transactions...`);
            // Verify each balance
            for (const balance of balances) {
                try {
                    const verification = await this.ledgerRepo.verifyBalanceConsistency(balance.entity_type, balance.entity_id, balance.currency);
                    if (verification.isConsistent) {
                        result.summary.consistentBalances++;
                    }
                    else {
                        result.summary.inconsistentBalances++;
                        result.status = 'FAIL';
                        const difference = verification.storedBalance - verification.calculatedBalance;
                        result.details.inconsistencies.push({
                            entityType: balance.entity_type,
                            entityId: balance.entity_id,
                            currency: balance.currency,
                            storedBalance: verification.storedBalance.toString(),
                            calculatedBalance: verification.calculatedBalance.toString(),
                            difference: difference.toString()
                        });
                        console.warn(`Inconsistency found: ${balance.entity_type}:${balance.entity_id}:${balance.currency} - stored: ${verification.storedBalance}, calculated: ${verification.calculatedBalance}`);
                    }
                }
                catch (error) {
                    result.summary.errors.push(`Error verifying ${balance.entity_type}:${balance.entity_id}:${balance.currency} - ${error.message}`);
                    result.status = 'FAIL';
                }
            }
            console.log(`Verification complete: ${result.summary.consistentBalances} consistent, ${result.summary.inconsistentBalances} inconsistent`);
        }
        catch (error) {
            result.status = 'FAIL';
            result.summary.errors.push(`Fatal error: ${error.message}`);
            console.error('Fatal error during verification:', error);
        }
        return result;
    }
    /**
     * Replay transactions in chronological order and rebuild balances
     */
    async replayTransactions(dryRun = true) {
        const errors = [];
        let processedTransactions = 0;
        try {
            if (!dryRun) {
                console.log('WARNING: This will rebuild all ledger balances. Ensure database is backed up!');
                console.log('Starting in 5 seconds...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                // Clear existing balances
                await kysely_1.kysely.deleteFrom('ledger_balances').execute();
                console.log('Cleared existing balances');
            }
            // Get all transactions in chronological order
            const batchSize = 1000;
            let offset = 0;
            let hasMore = true;
            while (hasMore) {
                const transactions = await kysely_1.kysely
                    .selectFrom('ledger_transactions')
                    .selectAll()
                    .orderBy('created_at', 'asc')
                    .limit(batchSize)
                    .offset(offset)
                    .execute();
                if (transactions.length === 0) {
                    hasMore = false;
                    break;
                }
                for (const transaction of transactions) {
                    try {
                        if (!dryRun) {
                            // Recalculate balance change
                            const balanceChange = transaction.direction === 'credit'
                                ? BigInt(transaction.amount_minor)
                                : -BigInt(transaction.amount_minor);
                            // Upsert balance
                            await kysely_1.kysely
                                .insertInto('ledger_balances')
                                .values({
                                id: kysely_1.kysely.fn('uuid_generate_v4'),
                                entity_type: transaction.entity_type,
                                entity_id: transaction.entity_id,
                                currency: transaction.currency,
                                balance_minor: balanceChange.toString(),
                                last_transaction_id: transaction.id,
                                created_at: new Date(),
                                updated_at: new Date()
                            })
                                .onConflict((oc) => oc.columns(['entity_type', 'entity_id', 'currency']).doUpdateSet({
                                balance_minor: kysely_1.kysely.raw('ledger_balances.balance_minor + ?::bigint', [balanceChange.toString()]),
                                last_transaction_id: transaction.id,
                                updated_at: new Date()
                            }))
                                .execute();
                        }
                        processedTransactions++;
                        if (processedTransactions % 1000 === 0) {
                            console.log(`Processed ${processedTransactions} transactions...`);
                        }
                    }
                    catch (error) {
                        errors.push(`Error processing transaction ${transaction.id}: ${error.message}`);
                    }
                }
                offset += batchSize;
            }
            console.log(`${dryRun ? 'Simulated' : 'Completed'} replay of ${processedTransactions} transactions`);
        }
        catch (error) {
            errors.push(`Fatal error during replay: ${error.message}`);
            return { success: false, processedTransactions, errors };
        }
        return { success: errors.length === 0, processedTransactions, errors };
    }
    /**
     * Generate summary report
     */
    async generateSummaryReport() {
        try {
            const summary = await kysely_1.kysely
                .selectFrom('ledger_balances')
                .select([
                'entity_type',
                'currency',
                kysely_1.kysely.fn.count('id').as('entity_count'),
                kysely_1.kysely.fn.sum('balance_minor').as('total_balance'),
                kysely_1.kysely.fn.min('balance_minor').as('min_balance'),
                kysely_1.kysely.fn.max('balance_minor').as('max_balance')
            ])
                .groupBy(['entity_type', 'currency'])
                .execute();
            const transactionSummary = await kysely_1.kysely
                .selectFrom('ledger_transactions')
                .select([
                'entity_type',
                'currency',
                'direction',
                kysely_1.kysely.fn.count('id').as('transaction_count'),
                kysely_1.kysely.fn.sum('amount_minor').as('total_amount')
            ])
                .groupBy(['entity_type', 'currency', 'direction'])
                .execute();
            return {
                balanceSummary: summary,
                transactionSummary: transactionSummary,
                generatedAt: new Date()
            };
        }
        catch (error) {
            return { error: error.message };
        }
    }
}
exports.LedgerReplayVerifier = LedgerReplayVerifier;
// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'verify';
    const jsonOutput = args.includes('--json');
    const dryRun = !args.includes('--execute');
    const verifier = new LedgerReplayVerifier();
    try {
        switch (command) {
            case 'verify':
                const result = await verifier.verifyLedger();
                if (jsonOutput) {
                    console.log(JSON.stringify(result, null, 2));
                }
                else {
                    console.log(`Verification ${result.status}`);
                    console.log(`Consistent balances: ${result.summary.consistentBalances}/${result.summary.totalBalances}`);
                    if (result.summary.inconsistentBalances > 0) {
                        console.log('Inconsistencies:', result.details?.inconsistencies);
                    }
                }
                process.exit(result.status === 'PASS' ? 0 : 1);
                break;
            case 'replay':
                const replayResult = await verifier.replayTransactions(dryRun);
                if (jsonOutput) {
                    console.log(JSON.stringify(replayResult, null, 2));
                }
                else {
                    console.log(`Replay ${replayResult.success ? 'completed' : 'failed'}`);
                    console.log(`Processed: ${replayResult.processedTransactions} transactions`);
                    if (replayResult.errors.length > 0) {
                        console.log('Errors:', replayResult.errors);
                    }
                }
                process.exit(replayResult.success ? 0 : 1);
                break;
            case 'summary':
                const summary = await verifier.generateSummaryReport();
                console.log(JSON.stringify(summary, null, 2));
                break;
            default:
                console.log('Usage: ts-node ledger_replay_verify.ts [verify|replay|summary] [--json] [--execute]');
                console.log('  verify  - Verify balance consistency (default)');
                console.log('  replay  - Replay transactions and rebuild balances');
                console.log('  summary - Generate summary report');
                console.log('  --json  - Output in JSON format');
                console.log('  --execute - Actually execute changes (replay only, default is dry-run)');
                process.exit(1);
        }
    }
    catch (error) {
        console.error('Script error:', error);
        process.exit(1);
    }
    finally {
        await kysely_1.kysely.destroy();
    }
}
// Run if called directly
if (require.main === module) {
    main();
}
//# sourceMappingURL=ledger_replay_verify.js.map