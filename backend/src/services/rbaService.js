const eventBus = require('../events/eventBus');

/**
 * Rule-Based Actions (RBA) Service
 * This service encapsulates the business logic that triggers the Rule-Based Actions.
 * By using the EventBus, this service doesn't need to know anything about Redis
 * or how notifications are delivered. It just emits the domain events.
 */
class RBAService {

    /**
     * Scenario 1: Process Weather Payout
     * Typically called by a chron job or webhook from a Weather API/ML model
     */
    async processWeatherPayout(workerId, zone, amount, weatherCondition) {
        // ... [Business logic: Check policy validity, deduct from reserve pool, update DB] ...

        console.log(`[RBAService] Processing weather payout for ${workerId} in ${zone} due to ${weatherCondition}`);

        // Action happens successfully, emit event for decoupling
        eventBus.emit('payout:auto_approved', {
            workerId,
            amount,
            zone,
            reason: weatherCondition,
        });

        return { success: true, message: 'Payout approved and event emitted.' };
    }

    /**
     * Scenario 2: Process Weekly Premium Deduction
     * Called automatically at the end of a billing cycle
     */
    async processPremiumDeduction(workerId, amount, hasSufficientFunds) {
        // ... [Business logic: Attempt deduction from wallet] ...

        console.log(`[RBAService] Processing premium deduction of ${amount} for ${workerId}. Success: ${hasSufficientFunds}`);

        eventBus.emit('premium:deduction_attempted', {
            workerId,
            amount,
            success: hasSufficientFunds
        });

        return { success: hasSufficientFunds };
    }

    /**
     * Scenario 3: Reject Fraudulent Claim
     * Called when an admin reviews a claim or an ML model flags it
     */
    async rejectFraudulentClaim(workerId, claimId, penaltyCredits, reason) {
        // ... [Business logic: Update claim status to rejected, update worker trust score] ...

        console.log(`[RBAService] Rejecting claim ${claimId} for ${workerId} due to ${reason}`);

        eventBus.emit('claim:fraud_detected', {
            workerId,
            claimId,
            penaltyCredits,
            reason
        });

        return { success: true, status: 'REJECTED' };
    }

    /**
     * Scenario 4a: ML Model Training Completion
     */
    async signalMLTrainingComplete(dataSource) {
        console.log(`[RBAService] ML Training completed using ${dataSource}`);
        eventBus.emit('system:ml_training_completed', { dataSource });
    }

    /**
     * Scenario 4b: Low Reserve Funds
     */
    async checkReserveFunds(currentBalance, threshold) {
        if (currentBalance < threshold) {
            console.log(`[RBAService] Reserve funds low! Balance: ${currentBalance}, Threshold: ${threshold}`);
            eventBus.emit('system:funds_low', { currentBalance, threshold });
        }
    }
}

module.exports = new RBAService();
