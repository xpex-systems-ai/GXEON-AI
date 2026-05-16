'use strict';

const express = require('express');
const router = express.Router();
const activation = require('../runtime/phase5Activation.cjs');
const { conversionEngine } = require('../core/conversion/conversionEngine.js');
const { persistence } = require('../runtime/persistence.cjs');

function send(res, payload) {
  res.status(200).json({ success: true, ...payload });
}

router.get('/activation/reports', (req, res) => send(res, activation.buildActivationReports()));
router.get('/dashboard/runtime', (req, res) => send(res, activation.buildDashboardRuntime()));
router.get('/dashboard/activation', (req, res) => send(res, activation.buildDashboardRuntime()));
router.get('/swarm/status', (req, res) => send(res, { swarm: activation.buildSwarmStatus(), persistence: persistence.getStatus() }));
router.get('/swarm/persistence', (req, res) => send(res, activation.buildActivationReports().swarm_persistence_report));
router.get('/monetization/status', (req, res) => send(res, activation.buildMonetizationStatus()));
router.get('/monetization/health', (req, res) => send(res, { health: activation.buildMonetizationStatus() }));
router.get('/system/metrics', (req, res) => send(res, activation.buildSystemMetrics()));
router.get('/providers/status', (req, res) => send(res, activation.buildProviderStatus()));
router.get('/deployment/readiness', (req, res) => send(res, activation.buildDeploymentActivationReport()));
router.get('/recovery/status', (req, res) => send(res, activation.buildRecoveryStatus()));
router.get('/visualization/runtime', (req, res) => send(res, activation.buildVisualizationPayload()));

router.get('/conversion/metrics', (req, res) => send(res, conversionEngine.getMetrics()));
router.get('/conversion/opportunities', (req, res) => send(res, { opportunities: conversionEngine.getOpportunities(), generated_at: new Date().toISOString() }));
router.get('/conversion/leaderboard', (req, res) => send(res, { leaderboard: conversionEngine.getLeaderboard(), generated_at: new Date().toISOString() }));
router.post('/conversion/telemetry', async (req, res) => {
  const event = conversionEngine.recordTelemetry(req.body || {});
  const persisted = await persistence.persist('runtime_metrics', {
    id: event.id,
    metric_name: 'conversion_telemetry',
    value: event.score,
    event,
    source: 'conversion-engine'
  }, { idempotencyKey: event.id });
  send(res, { event, persisted });
});

router.get('/observability/summary', (req, res) => send(res, activation.buildObservabilitySummary('summary')));
router.get('/observability/runtime', (req, res) => send(res, activation.buildObservabilitySummary('runtime')));
router.get('/observability/swarm', (req, res) => send(res, activation.buildObservabilitySummary('swarm')));
router.get('/observability/revenue', (req, res) => send(res, activation.buildObservabilitySummary('revenue')));
router.get('/observability/recovery', (req, res) => send(res, activation.buildObservabilitySummary('recovery')));

router.post('/persistence/:table', async (req, res) => {
  try {
    const result = await persistence.persist(req.params.table, req.body || {}, { idempotencyKey: req.headers['idempotency-key'] });
    send(res, { persistence: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
