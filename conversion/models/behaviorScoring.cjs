function clamp01(v){ return Math.max(0, Math.min(1, v)); }

function behaviorScore(input){
  const session = clamp01((input.session_duration_s||0)/600);
  const actions = clamp01((input.workflow_actions||0)/20);
  const returns = clamp01((input.return_frequency||0)/10);
  const checkout = clamp01((input.checkout_behavior||0)/5);
  const social = clamp01((input.social_proof_interaction||0)/10);

  const weighted = (session*0.25)+(actions*0.20)+(returns*0.15)+(checkout*0.25)+(social*0.15);
  const score = Math.round(weighted*100);
  return { score, tier: scoreTier(score) };
}

function scoreTier(score){
  if (score <= 25) return 'LOW_INTENT';
  if (score <= 50) return 'ENGAGED';
  if (score <= 75) return 'HIGH_INTENT';
  return 'CONVERSION_READY';
}

function intentLevelFromSignals(signals){
  const watch = clamp01((signals.watch_time_s||0)/300) * 0.18;
  const session = clamp01((signals.session_duration_s||0)/600) * 0.20;
  const checkout = clamp01((signals.checkout_events||0)/3) * 0.28;
  const returnVisit = clamp01((signals.return_visits||0)/5) * 0.14;
  const engagement = clamp01((signals.engagement_actions||0)/20) * 0.20;
  const heat = Math.round((watch+session+checkout+returnVisit+engagement)*100);
  if (heat < 20) return { heat, intent:'COLD' };
  if (heat < 40) return { heat, intent:'WARM' };
  if (heat < 60) return { heat, intent:'HOT' };
  if (heat < 80) return { heat, intent:'BUYER' };
  return { heat, intent:'HYPER_BUYER' };
}

module.exports = { behaviorScore, scoreTier, intentLevelFromSignals };
