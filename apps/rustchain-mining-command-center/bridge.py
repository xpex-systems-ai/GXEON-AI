from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import urlopen, Request
from urllib.parse import urlencode
import json, time

HOST='127.0.0.1'; PORT=8788
NODE='http://50.28.86.131:8088'
WALLET='RTC82c21b7f32d0e65c4aa9785d6561a55ff6127269'

def get_json(path, params=None):
    url=NODE+path
    if params: url += '?' + urlencode(params)
    req=Request(url, headers={'User-Agent':'GXEON-Local-Bridge/1.0'})
    with urlopen(req, timeout=8) as r:
        return json.loads(r.read().decode('utf-8'))

def status():
    out={'adapter':'LIVE / LOCAL BRIDGE','bridge_online':True,'wallet':WALLET,'node':NODE,'timestamp':int(time.time()),
         'fingerprint':{'passed':6,'total':6,'source':'last-known verified run'},
         'hardware_binding':'BOUND','attestation':'ACTION_REQUIRED','enrollment':'BLOCKED',
         'blocker':'ENROLLMENT_SIGNING_KEY_REQUIRED','payment':{'verified':False,'balance':None,'evidence':None}}
    try:
        ep=get_json('/epoch'); out['network']={'reachable':True,**ep}
    except Exception as e:
        out['network']={'reachable':False,'error':str(e)}
    try:
        out['eligibility']=get_json('/lottery/eligibility',{'miner_id':WALLET})
    except Exception as e:
        out['eligibility']={'error':str(e)}
    return out

class H(BaseHTTPRequestHandler):
    def _headers(self, code=200):
        self.send_response(code); self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin','*')
        self.send_header('Access-Control-Allow-Methods','GET,OPTIONS'); self.send_header('Access-Control-Allow-Headers','Content-Type'); self.end_headers()
    def do_OPTIONS(self): self._headers(204)
    def do_GET(self):
        if self.path.startswith('/api/status'):
            self._headers(); self.wfile.write(json.dumps(status()).encode())
        elif self.path.startswith('/health'):
            self._headers(); self.wfile.write(b'{"ok":true}')
        else:
            self._headers(404); self.wfile.write(b'{"error":"not_found"}')
    def log_message(self, fmt, *args): pass

if __name__=='__main__':
    print(f'GXEON Local Bridge LIVE on http://{HOST}:{PORT}')
    print('Public telemetry only. No private keys are read or exposed.')
    ThreadingHTTPServer((HOST,PORT),H).serve_forever()
