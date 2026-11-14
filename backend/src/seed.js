/**
 * Seed script.
 *   node src/seed.js            -> wipe + seed admin, 24 doctors, ~180 patients
 *   node src/seed.js --destroy  -> wipe only
 *
 * Credentials come from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars
 * (defaults below are for local development only).
 */
require('dotenv').config();

const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Doctor = require('./models/Doctor');
const Patient = require('./models/Patient');

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@doctortracker.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'Portal Admin';

// ---- deterministic pseudo-random generator (same data on every run) ----
let seedState = 42;
function rand() {
  seedState = (seedState * 1103515245 + 12345) % 2147483648;
  return seedState / 2147483648;
}
function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}
function randInt(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

const SPECIALIZATIONS = [
  'Cardiology',
  'Neurology',
  'Pediatrics',
  'Orthopedics',
  'Dermatology',
  'General Medicine',
  'Gynecology',
  'Oncology',
];

const HOSPITALS = [
  'Square Hospital, Dhaka',
  'United Hospital, Dhaka',
  'Apollo Hospital, Dhaka',
  'Evercare Hospital, Dhaka',
  'Ibn Sina Diagnostic, Dhaka',
  'BSMMU, Shahbag',
];

const FIRST_NAMES = ['Arif', 'Nusrat', 'Tanvir', 'Sadia', 'Imran', 'Farhana', 'Rakib', 'Mehjabin', 'Shafiq', 'Rumana', 'Kamrul', 'Tasnim'];
const LAST_NAMES = ['Hossain', 'Islam', 'Rahman', 'Akter', 'Chowdhury', 'Ahmed', 'Karim', 'Sultana', 'Mia', 'Bhuiyan'];
const PATIENT_FIRST = ['Rahim', 'Karima', 'Jamal', 'Selina', 'Omar', 'Laila', 'Hasan', 'Rina', 'Sohel', 'Parvin', 'Mizan', 'Shirin'];
const CONDITIONS = ['Critical', 'Serious', 'Stable', 'Recovering', 'Chronic', 'Under Observation'];
const STATUSES = ['admitted', 'discharged', 'follow-up'];
const NOTE_SAMPLES = [
  'Scheduled for follow-up next week.',
  'Responding well to treatment.',
  'Blood pressure monitored twice daily.',
  'Recommended lifestyle changes.',
  'Referred for additional tests.',
  '',
];

function phone() {
  const p = randInt(1000000000, 9999999999);
  return `+880 1${randInt(1, 9)}${String(p).slice(0, 8)}`;
}

// Spread createdAt deterministically across the last 60 days for date-based charts.
function randomPastDate(daysBack = 60) {
  const d = new Date();
  d.setDate(d.getDate() - randInt(0, daysBack));
  d.setHours(randInt(8, 20), randInt(0, 59), 0, 0);
  return d;
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[seed] connected');

  // Wipe
  await Promise.all([
    Admin.deleteMany({}),
    Doctor.deleteMany({}),
    Patient.deleteMany({}),
  ]);
  console.log('[seed] collections cleared');
  if (process.argv.includes('--destroy')) {
    await mongoose.connection.close();
    console.log('[seed] destroy-only run finished');
    return;
  }

  // Admin
  await Admin.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    passwordHash: ADMIN_PASSWORD, // hashed by the pre-save hook
  });
  console.log(`[seed] admin created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

  // Doctors
  const doctorDocs = [];
  const usedEmails = new Set();
  for (let i = 0; i < 24; i += 1) {
    const name = `Dr. ${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    let email = `dr${i + 1}@example-health.com`;
    while (usedEmails.has(email)) email = `dr${i + 1}a@example-health.com`;
    usedEmails.add(email);
    doctorDocs.push({
      name,
      specialization: pick(SPECIALIZATIONS),
      hospital: pick(HOSPITALS),
      phone: phone(),
      email,
      consultationFee: pick([500, 800, 1000, 1200, 1500, 2000]),
      status: rand() > 0.15 ? 'active' : 'inactive',
      createdAt: randomPastDate(60),
    });
  }
  const doctors = await Doctor.insertMany(doctorDocs);
  console.log(`[seed] ${doctors.length} doctors created`);

  // Patients: 4-12 per doctor (~180 total)
  const patientDocs = [];
  doctors.forEach((doc) => {
    const n = randInt(4, 12);
    for (let j = 0; j < n; j += 1) {
      const createdAt = randomPastDate(45);
      patientDocs.push({
        name: `${pick(PATIENT_FIRST)} ${pick(LAST_NAMES)}`,
        age: randInt(1, 90),
        gender: pick(['male', 'female', 'other']),
        condition: pick(CONDITIONS),
        doctor: doc._id,
        phone: phone(),
        status: pick(STATUSES),
        notes: pick(NOTE_SAMPLES),
        createdAt,
        updatedAt: createdAt,
      });
    }
  });
  const patients = await Patient.insertMany(patientDocs);
  console.log(`[seed] ${patients.length} patients created`);

  await mongoose.connection.close();
  console.log('[seed] done');
}

seed().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
