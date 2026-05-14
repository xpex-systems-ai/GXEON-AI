const http = require('http');
const { server } = require('../api/conversion/conversionApi.cjs');
server.listen(0,()=>{const port=server.address().port; const paths=['/api/conversion/snapshot','/api/conversion/behavior-score?session_duration_s=240&workflow_actions=8&return_frequency=2&checkout_behavior=1&social_proof_interaction=3','/api/conversion/intent?watch_time_s=140&session_duration_s=220&checkout_events=1&return_visits=1&engagement_actions=9'];
let pending=paths.length+1;
for(const p of paths){http.get({host:'127.0.0.1',port,path:p},(r)=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{console.log(p,r.statusCode,d.slice(0,160)); if(--pending===0)server.close();});});}
const req=http.request({host:'127.0.0.1',port,path:'/api/conversion/tick',method:'POST'},(r)=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{console.log('/api/conversion/tick',r.statusCode,d.slice(0,160)); if(--pending===0)server.close();});}); req.end();
});
