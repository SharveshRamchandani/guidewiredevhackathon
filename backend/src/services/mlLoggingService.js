  const { query } = require('../config/db');

async function logPrediction({
  predictionType,
  workerId = null,
  policyId = null,
  claimId = null,
  eventId = null,
  modelName,
  modelVersion = 'v1',
  decision = null,
  inputPayload = {},
  outputPayload = {},
}) {
  try {
    await query(
      `INSERT INTO ml_prediction_logs
         (prediction_type, worker_id, policy_id, claim_id, event_id,
          model_name, model_version, decision, input_payload, output_payload, created_at)
       VALUES ($1, $2, $3, $4, $5,
               $6, $7, $8, $9::jsonb, $10::jsonb, NOW())`,
      [
        predictionType,
        workerId,
        policyId,
        claimId,
        eventId,
        modelName,
        modelVersion,
        decision,
        JSON.stringify(inputPayload || {}),
        JSON.stringify(outputPayload || {}),
      ]
    );
  } catch (error) {
    console.warn('[ML Logging] Failed to persist prediction log:', error.message);
  }
}

module.exports = { logPrediction };
