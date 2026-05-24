const http = require('http');
const { server } = require('../api/runtime/operatorApiServer.cjs');

server.listen(0, () => {
  const port = server.address().port;
  const paths = ['/api/runtime/snapshot', '/api/operators/control-plane', '/api/runtime/events?limit=2'];
  let pending = paths.length;
  for (const p of paths) {
    http.get({ host: '127.0.0.1', port, path: p }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        console.log(p, res.statusCode, data.slice(0, 180));
        if (--pending === 0) server.close();
      });
    });
  }
});
