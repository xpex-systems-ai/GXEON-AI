const http = require('http');
const { computeConversionSnapshot, runConversionTick } = require('../../conversion/runtime/conversionEngine.cjs');
const { behaviorScore } = require('../../conversion/models/behaviorScoring.cjs');
const j=(res,c,p)=>{res.writeHead(c,{'Content-Type':'application/json'});res.end(JSON.stringify(p));};
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://x');
 if(req.method==='GET'&&u.pathname==='/api/conversion/snapshot') return j(res,200,computeConversionSnapshot());
 if(req.method==='POST'&&u.pathname==='/api/conversion/tick') return j(res,200,runConversionTick());
 if(req.method==='GET'&&u.pathname==='/api/conversion/behavior-score') {
  const payload={session_duration_s:Number(u.searchParams.get('session_duration_s')||0),workflow_actions:Number(u.searchParams.get('workflow_actions')||0),marketplace_navigation:Number(u.searchParams.get('marketplace_navigation')||0)};
  return j(res,200,{input:payload,score:behaviorScore(payload)});
 }
 j(res,404,{error:'NOT_FOUND'});
});
module.exports={server};
if(require.main===module){server.listen(Number(process.env.GXEON_CONVERSION_API_PORT||8794),()=>console.log('conversion api on'));}
