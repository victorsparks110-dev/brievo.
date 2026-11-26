const http = require('http');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const req = http.request(opts, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch { resolve(buf); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  // 1. Login as support
  console.log('1. Logging in as support...');
  const login = await request('POST', '/api/auth/login', { email: 'victorsparks110@gmail.com', password: 'Sparks110!' });
  console.log('   Login result:', login.success ? 'OK' : login.message);
  if (!login.success) {
    // Try other support accounts
    const login2 = await request('POST', '/api/auth/login', { email: 'supfinal-359151605@example.com', password: 'Test1234!' });
    console.log('   Login2 result:', login2.success ? 'OK' : login2.message);
    if (!login2.success) return;
    var token = login2.data.token;
  } else {
    var token = login.data.token;
  }
  console.log('   Token:', token ? 'present' : 'MISSING');

  // 2. List tickets as support
  console.log('\n2. Listing tickets as support...');
  const tickets = await request('GET', '/api/support/admin/tickets', null, token);
  if (!tickets.success) { console.log('   Failed:', tickets); return; }
  const tmanTicket = tickets.tickets.find(t => t.email === 'tman39503@gmail.com' && t.subject === 'sdfsdf');
  if (!tmanTicket) { console.log('   No sdfsdf ticket found'); console.log('   Available:', tickets.tickets.map(t => t.subject + ' (' + t.email + ')')); return; }
  console.log('   Found ticket:', tmanTicket.id, tmanTicket.subject, 'status:', tmanTicket.status, 'response:', tmanTicket.response);

  // 3. Reply to the ticket
  console.log('\n3. Replying to ticket...');
  const reply = await request('POST', `/api/support/admin/tickets/${tmanTicket.id}/reply`, { response: 'This is a test reply from support. Can you see this?' }, token);
  console.log('   Reply result:', JSON.stringify(reply, null, 2));

  // 4. Now login as tman39503 and check my-tickets
  console.log('\n4. Logging in as designer...');
  const designerLogin = await request('POST', '/api/auth/login', { email: 'tman39503@gmail.com', password: 'Sparks110!' });
  if (!designerLogin.success) {
    const designerLogin2 = await request('POST', '/api/auth/login', { email: 'tman39503@gmail.com', password: 'Test1234!' });
    console.log('   Designer login2:', designerLogin2.success ? 'OK' : designerLogin2.message);
    if (!designerLogin2.success) return;
    var dtoken = designerLogin2.data.token;
  } else {
    var dtoken = designerLogin2.data?.token || designerLogin.data.token;
  }
  console.log('   Designer token:', dtoken ? 'present' : 'MISSING');

  // 5. Get my tickets as designer
  console.log('\n5. Getting my tickets as designer...');
  const myTickets = await request('GET', '/api/support/my-tickets', null, dtoken);
  console.log('   Result:', JSON.stringify(myTickets, null, 2));
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
