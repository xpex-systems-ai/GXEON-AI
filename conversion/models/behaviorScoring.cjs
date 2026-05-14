function behaviorScore(input){
  const session = Math.min((input.session_duration_s||0)/300,1);
  const actions = Math.min((input.workflow_actions||0)/10,1);
  const marketplace = Math.min((input.marketplace_navigation||0)/10,1);
  return Number(((session*0.4)+(actions*0.4)+(marketplace*0.2)).toFixed(4));
}
module.exports = { behaviorScore };
