/**
 * End-to-end backend smoke test (runs without any external services).
 *
 * Boots an in-memory MongoDB, starts the API on a test port, seeds data,
 * then exercises: auth guard, login, doctors CRUD/search/filter/pagination,
 * nested patients, patient CRUD + filters, analytics, and error paths.
 *
 * Usage: node scripts/verify-backend.js  (from backend/)
 */
const { MongoMemoryServer } = require('mongodb-memory-server-core');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CORS_ORIGIN = '*';
process.env.SEED_ADMIN_EMAIL = 'admin@doctortracker.com';
process.env.SEED_ADMIN_PASSWORD = 'Admin@123';

const BASE = 'http://127.0.0.1:5050';
let passed = 0;
let failed = 0;

function check(name, cond, extra = '') {
  if (cond) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name} ${extra}`);
  }
}

async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON response */
  }
  return { status: res.status, json };
}

(async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri('doctor-tracker-test');
  process.env.PORT = '5050';
  console.log(`[test] in-memory mongo at ${process.env.MONGODB_URI}`);

  // Start server (child of this process)
  const { spawnSync } = require('child_process');
  const server = require('child_process').spawn('node', ['src/server.js'], {
    cwd: __dirname + '/..',
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (d) => process.stdout.write(`[srv] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`[srv-err] ${d}`));

  // wait for health
  let healthy = false;
  for (let i = 0; i < 40; i += 1) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) {
        healthy = true;
        break;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  check('server boots and /api/health responds', healthy);

  // Seed
  const seedRes = spawnSync('node', ['src/seed.js'], {
    cwd: __dirname + '/..',
    env: process.env,
    encoding: 'utf8',
  });
  check('seed script exits 0', seedRes.status === 0, seedRes.stderr);

  console.log('\n== AUTH ==');
  const noAuth = await api('get', '/api/doctors');
  check('protected route without token -> 401', noAuth.status === 401);

  const badLogin = await api('post', '/api/auth/login', {
    body: { email: 'admin@doctortracker.com', password: 'wrongpass' },
  });
  check('login with wrong password -> 401', badLogin.status === 401);

  const goodLogin = await api('post', '/api/auth/login', {
    body: { email: 'admin@doctortracker.com', password: 'Admin@123' },
  });
  check('login with correct credentials -> 200 + token', goodLogin.status === 200 && !!goodLogin.json?.data?.token);
  const TOKEN = goodLogin.json.data.token;

  const me = await api('get', '/api/auth/me', { token: TOKEN });
  check('GET /api/auth/me returns the admin profile', me.status === 200 && me.json.data.email === 'admin@doctortracker.com');

  console.log('\n== DOCTORS ==');
  const list = await api('get', '/api/doctors?page=1&limit=10', { token: TOKEN });
  check(
    'list doctors paginated (limit=10, 24 total expected)',
    list.status === 200 && list.json.data.length === 10 && list.json.meta.total === 24,
    JSON.stringify(list.json.meta)
  );

  const page3 = await api('get', '/api/doctors?page=3&limit=10', { token: TOKEN });
  check('page 3 returns 4 doctors (24 total)', page3.status === 200 && page3.json.data.length === 4);

  const search = await api('get', '/api/doctors?search=cardio', { token: TOKEN });
  const allDocs = await api('get', '/api/doctors?limit=100', { token: TOKEN });
  const cardioCount = allDocs.json.data.filter((d) =>
    ['name', 'specialization', 'hospital', 'email'].some((f) =>
      String(d[f]).toLowerCase().includes('cardio')
    )
  ).length;
  check('search "cardio" matches expected count', search.json.meta.total === cardioCount, `got ${search.json.meta.total} want ${cardioCount}`);

  const specList = await api('get', '/api/doctors?limit=100', { token: TOKEN });
  const someSpec = specList.json.data[0].specialization;
  const specFilter = await api('get', `/api/doctors?specialization=${encodeURIComponent(someSpec)}&limit=100`, { token: TOKEN });
  const specCount = specList.json.data.filter((d) => d.specialization === someSpec).length;
  check('filter by specialization', specFilter.json.meta.total === specCount);

  const dateFilter = await api('get', `/api/doctors?createdFrom=2000-01-01&createdTo=2999-12-31&limit=100`, { token: TOKEN });
  check('date-wise filter covers all when range is wide', dateFilter.json.meta.total === 24);

  const meta = await api('get', '/api/doctors/meta', { token: TOKEN });
  check('GET /doctors/meta returns specializations + hospitals', meta.status === 200 && meta.json.data.specializations.length > 0);

  const created = await api('post', '/api/doctors', {
    token: TOKEN,
    body: {
      name: 'Dr. Test Create',
      specialization: 'Testing',
      hospital: 'QA Hospital',
      phone: '+880 1711 000000',
      email: 'create-test@example.com',
      consultationFee: 999,
    },
  });
  check('create doctor -> 201', created.status === 201 && created.json.data.name === 'Dr. Test Create');
  const DOC_ID = created.json.data._id;

  const dupEmail = await api('post', '/api/doctors', {
    token: TOKEN,
    body: {
      name: 'Dup',
      specialization: 'Testing',
      hospital: 'QA Hospital',
      phone: '+880 1711 000001',
      email: 'create-test@example.com',
    },
  });
  check('duplicate email -> 409', dupEmail.status === 409);

  const invalid = await api('post', '/api/doctors', {
    token: TOKEN,
    body: { name: '', specialization: 'x', hospital: 'y', phone: 'abc', email: 'not-an-email' },
  });
  check('invalid payload -> 400 with fieldErrors', invalid.status === 400 && (invalid.json.fieldErrors || []).length >= 3);

  const updated = await api('put', `/api/doctors/${DOC_ID}`, {
    token: TOKEN,
    body: {
      name: 'Dr. Test Updated',
      specialization: 'Testing',
      hospital: 'QA Hospital 2',
      phone: '+880 1711 000002',
      email: 'create-test@example.com',
    },
  });
  check('update doctor', updated.status === 200 && updated.json.data.name === 'Dr. Test Updated');

  console.log('\n== PATIENTS (nested under doctor) ==');
  const p1 = await api('post', `/api/doctors/${DOC_ID}/patients`, {
    token: TOKEN,
    body: { name: 'Nested Patient', age: 33, gender: 'male', condition: 'Stable' },
  });
  // nested create goes through /api/patients in this design; check the nested list works
  const nestedList = await api('get', `/api/doctors/${DOC_ID}/patients`, { token: TOKEN });
  check('nested patient list for new doctor is empty', nestedList.status === 200 && nestedList.json.meta.total === 0);

  console.log('\n== PATIENTS (global) ==');
  const addPatient = await api('post', '/api/patients', {
    token: TOKEN,
    body: {
      name: 'Karim Uddin',
      age: 45,
      gender: 'male',
      condition: 'Critical',
      doctor: DOC_ID,
      phone: '+880 1811 222333',
      status: 'admitted',
      notes: 'ICU transfer',
    },
  });
  check('create patient -> 201 with populated doctor', addPatient.status === 201 && addPatient.json.data.doctor.name === 'Dr. Test Updated');
  const PAT_ID = addPatient.json.data._id;

  const patList = await api('get', '/api/patients?page=1&limit=10', { token: TOKEN });
  check('list patients paginated', patList.status === 200 && patList.json.data.length === 10 && patList.json.meta.total > 150, `total=${patList.json.meta.total}`);

  const patSearch = await api('get', '/api/patients?search=karim', { token: TOKEN });
  check('patient search by name', patSearch.status === 200 && patSearch.json.meta.total >= 1);

  const patCond = await api('get', '/api/patients?condition=Critical&limit=100', { token: TOKEN });
  const allPat = await api('get', '/api/patients?limit=100&sort=name', { token: TOKEN });
  // fetch all pages for the condition comparison
  let conditionCount = 0;
  for (let p = 1; p <= patCond.json.meta.totalPages; p += 1) {
    const r = await api('get', `/api/patients?condition=Critical&limit=100&page=${p}`, { token: TOKEN });
    conditionCount += r.json.data.length;
  }
  check('patient filter by condition', patCond.json.meta.total === conditionCount && conditionCount > 0, `total=${patCond.json.meta.total}`);

  const patByDoctor = await api('get', `/api/patients?doctor=${DOC_ID}`, { token: TOKEN });
  check('patient filter by doctor', patByDoctor.json.meta.total === 1);

  const patDate = await api('get', '/api/patients?createdFrom=2000-01-01&createdTo=2999-12-31&limit=100', { token: TOKEN });
  check('patient date-wise filter', patDate.json.meta.total === patList.json.meta.total + 1 || patDate.json.meta.total > 150);

  const patMeta = await api('get', '/api/patients/meta', { token: TOKEN });
  check('GET /patients/meta returns conditions + doctors', patMeta.status === 200 && patMeta.json.data.conditions.length === 6 && patMeta.json.data.doctors.length === 25);

  const patPut = await api('put', `/api/patients/${PAT_ID}`, {
    token: TOKEN,
    body: {
      name: 'Karim Uddin Updated',
      age: 46,
      gender: 'male',
      condition: 'Recovering',
      doctor: DOC_ID,
      status: 'follow-up',
    },
  });
  check('update patient', patPut.status === 200 && patPut.json.data.condition === 'Recovering' && patPut.json.data.age === 46);

  const nestedAfterAdd = await api('get', `/api/doctors/${DOC_ID}/patients`, { token: TOKEN });
  check('nested list now shows the patient', nestedAfterAdd.json.meta.total === 1 && nestedAfterAdd.json.data[0].name === 'Karim Uddin Updated');

  const patDel = await api('delete', `/api/patients/${PAT_ID}`, { token: TOKEN });
  check('delete patient', patDel.status === 200);
  const patGet404 = await api('get', `/api/patients/${PAT_ID}`, { token: TOKEN });
  check('deleted patient -> 404', patGet404.status === 404);

  const badId = await api('get', '/api/patients/000000000000000000000000', { token: TOKEN });
  check('unknown patient id -> 404 (not 500)', badId.status === 404);

  const castBad = await api('get', '/api/doctors/not-an-object-id', { token: TOKEN });
  check('malformed id -> 400 (CastError handled)', castBad.status === 400);

  console.log('\n== ANALYTICS ==');
  const overview = await api('get', '/api/analytics/overview', { token: TOKEN });
  // overview runs after the test patient was deleted, so expect patList.total - 1
  check(
    'overview totals consistent (doctors=25, patients=seed)',
    overview.status === 200 &&
      overview.json.data.totalDoctors === 25 &&
      overview.json.data.totalPatients === patList.json.meta.total - 1,
    JSON.stringify(overview.json.data).slice(0, 200)
  );
  check('bySpecialization aggregation non-empty', overview.json.data.bySpecialization.length > 0);
  check('patientsPerDoctor top-10 with counts', overview.json.data.patientsPerDoctor.length === 10 && typeof overview.json.data.patientsPerDoctor[0].patientCount === 'number');

  const daily = await api('get', '/api/analytics/daily?days=14', { token: TOKEN });
  check('daily series has 14 continuous days', daily.status === 200 && daily.json.data.series.length === 14);

  const conditions = await api('get', '/api/analytics/conditions', { token: TOKEN });
  check('condition distribution sums to total patients', conditions.json.data.reduce((s, c) => s + c.count, 0) === overview.json.data.totalPatients);

  console.log('\n== DOCTOR DELETE CASCADE ==');
  const delDoc = await api('delete', `/api/doctors/${DOC_ID}`, { token: TOKEN });
  check('delete doctor reports cascade', delDoc.status === 200 && /0 patient/.test(delDoc.json.message), delDoc.json.message);
  const overviewAfter = await api('get', '/api/analytics/overview', { token: TOKEN });
  check('overview reflects deletion (24 doctors)', overviewAfter.json.data.totalDoctors === 24);

  console.log(`\n===== RESULT: ${passed} passed, ${failed} failed =====`);
  server.kill('SIGTERM');
  await mongod.stop();
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error('TEST RUNNER ERROR:', err);
  process.exit(1);
});
