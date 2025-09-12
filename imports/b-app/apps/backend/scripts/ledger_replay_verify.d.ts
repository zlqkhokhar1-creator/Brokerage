/**
 * Ledger Replay and Verification Script
 * Recalculates balances from transactions and verifies against stored balances
 */
interface ReplayResult {
    status: 'PASS' | 'FAIL';
    summary: {
        totalTransactions: number;
        totalBalances: number;
        consistentBalances: number;
        inconsistentBalances: number;
        errors: string[];
    };
    details?: {
        inconsistencies: Array<{
            entityType: string;
            entityId: string;
            currency: string;
            storedBalance: string;
            calculatedBalance: string;
            difference: string;
        }>;
    };
}
declare class LedgerReplayVerifier {
    private ledgerRepo;
    /**
     * Run full ledger verification
     */
    verifyLedger(): Promise<ReplayResult>;
    /**
     * Replay transactions in chronological order and rebuild balances
     */
    replayTransactions(dryRun?: boolean): Promise<{
        success: boolean;
        processedTransactions: number;
        errors: string[];
    }>;
    /**
     * Generate summary report
     */
    generateSummaryReport(): Promise<object>;
}
export { LedgerReplayVerifier };
