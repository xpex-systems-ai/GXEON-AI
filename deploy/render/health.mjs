import {request} from 'node:http';
// Loopback only; no credentials, target URLs or headers are printed.
const req=request({hostname:'127.0.0.1',port:Number(process.env.PORT),path:'/api/healthz',timeout:6000},res=>{
  let body='';res.on('data',chunk=>{body+=chunk;if(body.length>1024)res.destroy();});
  res.on('end',()=>{try{process.exitCode=res.statusCode===200&&JSON.parse(body).ok===true?0:1;}catch{process.exitCode=1;}});
});
req.on('error',()=>{process.exitCode=1;});req.on('timeout',()=>req.destroy());req.end();
