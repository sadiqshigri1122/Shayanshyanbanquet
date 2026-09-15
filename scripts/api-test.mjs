/** End-to-end API smoke & security tests */
const BASE = process.env.API_URL ?? 'http://localhost:3001';
const results = [];
let authToken = null;

async function req(method, path, body, headers = {}) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  };
  if (authToken) opts.headers.Authorization = `Bearer ${authToken}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
}

async function run() {
  let r = await req('GET', '/api/health');
  record('health', r.status === 200, String(r.status));

  r = await req('GET', '/api/public/meta');
  record('public meta', r.status === 200 && r.body.venues?.length > 0, `venues=${r.body.venues?.length}`);

  r = await req('GET', '/api/public/bookings/SB-1001');
  record('public booking lookup', r.status === 200 && r.body.bookingNumber === 'SB-1001', r.body.bookingNumber);

  r = await req('GET', '/api/state');
  record('state without auth', r.status === 401, `status=${r.status}`);

  r = await req('POST', '/api/auth/login', { email: 'ahmed@shayanbanquet.pk', password: 'wrong' });
  record('login wrong password', r.status === 401, String(r.status));

  r = await req('POST', '/api/auth/login', { email: 'ahmed@shayanbanquet.pk', password: 'shayan123' });
  authToken = r.body?.token ?? null;
  record('login success', r.status === 200 && authToken, r.body.user?.role);

  r = await req('GET', '/api/state');
  record('state with auth', r.status === 200 && r.body.bookings?.length > 0, `bookings=${r.body.bookings?.length}`);

  r = await req('GET', '/api/bookings');
  record('bookings list', r.status === 200 && Array.isArray(r.body), String(r.body?.length));

  r = await req('GET', '/api/bookings/b1');
  record('booking by id', r.status === 200 && r.body.bookingNumber === 'SB-1001', r.body.bookingNumber);

  r = await req('GET', '/api/availability?venueId=va-full&date=2026-09-15');
  record('availability conflict', r.status === 200 && r.body.available === false, JSON.stringify(r.body));

  r = await req('POST', '/api/inquiries', {
    name: 'Test User',
    phone: '0300-9998877',
    venueId: 'va-red',
    functionDate: '2027-06-01',
    programme: 'Test',
    numberOfGuests: 100,
  });
  record('inquiry', r.status === 200 && r.body.bookingNumber, r.body.bookingNumber ?? r.body.error);

  r = await req('POST', '/api/inquiries', {
    name: '',
    phone: 'bad',
    venueId: 'x',
    functionDate: 'invalid',
    programme: '',
    numberOfGuests: -1,
  });
  record('inquiry validation', r.status >= 400, String(r.status));

  r = await req('POST', '/api/customers', { name: 'API Test', phone: '0300-1119999', address: 'Test Addr' });
  record('create customer', r.status === 200 && r.body.id, r.body.id ?? r.body.error);

  const uniqueDate = `2030-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`;
  r = await req('POST', '/api/bookings', {
    customerId: 'c1',
    venueId: 'va-red',
    functionDate: uniqueDate,
    programme: 'Test Wedding',
    numberOfGuests: 150,
    services: [{ serviceId: 's1', serviceName: 'Hall Rent', quantity: 1, unitPrice: 50000, total: 50000 }],
    discount: 0,
    advancePaid: 10000,
    createdBy: 'Ahmed Khan',
  });
  const newBookingId = r.body?.id;
  record('create booking', r.status === 200 && r.body.bookingNumber, r.body.bookingNumber ?? r.body.error);

  if (newBookingId) {
    r = await req('POST', '/api/payments', {
      bookingId: newBookingId,
      amount: 5000,
      method: 'cash',
      receivedBy: 'Ahmed Khan',
    });
    record('add payment', r.status === 200 && r.body.receipt, String(r.status));
  }

  r = await req('GET', "/api/bookings/b1'; DROP TABLE Booking;--");
  record('sql injection', r.status === 404, String(r.status));

  // Office user cannot change settings
  r = await req('PATCH', '/api/settings', { companyName: 'Hacked Co' });
  record('settings as office user', r.status === 403, `status=${r.status}`);

  // Office user cannot approve
  r = await req('POST', '/api/approvals/ap1/decide', { approved: true, notes: 'hack', by: 'Hacker' });
  record('approval as office user', r.status === 403, `status=${r.status}`);

  // Login as manager
  r = await req('POST', '/api/auth/login', { email: 'ali@shayanbanquet.pk', password: 'shayan123' });
  authToken = r.body?.token ?? authToken;
  const stateRes = await req('GET', '/api/state');
  const pendingApproval = stateRes.body?.approvals?.find((a) => a.status === 'pending');
  if (pendingApproval) {
    r = await req('POST', `/api/approvals/${pendingApproval.id}/decide`, { approved: false, notes: 'test', by: 'Ali Hassan' });
    record('approval as manager', r.status === 200, String(r.status));
  } else {
    record('approval as manager', true, 'no pending approvals to test');
  }

  // Rate limit test (optional — exhausts login quota for this IP; restart API server to re-run)
  if (process.env.SECURITY_TEST === '1') {
    authToken = null;
    const loginAttempts = [];
    for (let i = 0; i < 12; i++) {
      const lr = await req('POST', '/api/auth/login', { email: 'rate-limit-test@shayanbanquet.pk', password: 'wrong' });
      loginAttempts.push(lr.status);
    }
    record('login rate limit', loginAttempts.some((s) => s === 429), loginAttempts.join(','));
  } else {
    record('login rate limit', true, 'skipped (set SECURITY_TEST=1 to run)');
  }

  const passed = results.filter((x) => x.pass).length;
  const failed = results.filter((x) => !x.pass);
  console.log('\n=== API Test Results ===');
  for (const t of results) {
    console.log(`${t.pass ? 'PASS' : 'FAIL'}: ${t.name}${t.detail ? ` — ${t.detail}` : ''}`);
  }
  console.log(`\n${passed}/${results.length} passed`);
  if (failed.length) process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
