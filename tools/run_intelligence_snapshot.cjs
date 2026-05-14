const { summarize } = require('../analytics/runtime/metricsKernel.cjs');
const { getOperatorView } = require('../analytics/operators/controlPlane.cjs');

console.log(JSON.stringify({ metrics: summarize(), operator: getOperatorView() }, null, 2));
