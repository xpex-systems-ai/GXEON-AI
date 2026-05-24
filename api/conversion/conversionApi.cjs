const http = require('http');
const { computeConversionSnapshot, runConversionTick, evaluateSignal } = require('../../conversion/runtime/conversionEngine.cjs');
const { behaviorScore } = require('../../conversion/models/behaviorScoring.cjs');
const j=(res,c,p)=>{res.writeHead(c,{'Content-Type':'application/json'});res.end(JSON.stringify(p));};

function num(q,k){ return Number(q.get(k)||0); }
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://x');
 if(req.method==='GET'&&u.pathname==='/api/conversion/snapshot') return j(res,200,computeConversionSnapshot());
 if(req.method==='POST'&&u.pathname==='/api/conversion/tick') return j(res,200,runConversionTick());
 if(req.method==='GET'&&u.pathname==='/api/conversion/behavior-score') {
  const payload={session_duration_s:num(u.searchParams,'session_duration_s'),workflow_actions:num(u.searchParams,'workflow_actions'),return_frequency:num(u.searchParams,'return_frequency'),checkout_behavior:num(u.searchParams,'checkout_behavior'),social_proof_interaction:num(u.searchParams,'social_proof_interaction')};
  return j(res,200,{input:payload,...behaviorScore(payload)});
 }
 if(req.method==='GET'&&u.pathname==='/api/conversion/intent') {
  const signal={watch_time_s:num(u.searchParams,'watch_time_s'),session_duration_s:num(u.searchParams,'session_duration_s'),checkout_events:num(u.searchParams,'checkout_events'),return_visits:num(u.searchParams,'return_visits'),engagement_actions:num(u.searchParams,'engagement_actions')};
  return j(res,200,evaluateSignal(signal));
 }
 j(res,404,{error:'NOT_FOUND'});
});
module.exports={server};
if(require.main===module){server.listen(Number(process.env.GXEON_CONVERSION_API_PORT||8794),()=>console.log('conversion api on'));}
