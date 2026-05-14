const http = require('http');
const { server } = require('../api/conversion/conversionApi.cjs');
server.listen(0,()=>{const port=server.address().port; const paths=['/api/conversion/snapshot','/api/conversion/behavior-score?session_duration_s=120&workflow_actions=3&marketplace_navigation=2'];
let pending=paths.length+1;
for(const p of paths){http.get({host:'127.0.0.1',port,path:p},(r)=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{console.log(p,r.statusCode,d.slice(0,140)); if(--pending===0)server.close();});});}
const req=http.request({host:'127.0.0.1',port,path:'/api/conversion/tick',method:'POST'},(r)=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{console.log('/api/conversion/tick',r.statusCode,d.slice(0,140)); if(--pending===0)server.close();});}); req.end();
});
