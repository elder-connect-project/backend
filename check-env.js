// Check .env configuration
// Run: node check-env.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking .env configuration...\n');

const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  console.error('\n📝 Run: node setup-env.js');
  process.exit(1);
}

console.log('✅ .env file exists\n');

// Check required values
const required = {
  'API_KEY': '8762a0be-9a2f-47b1-b0ed-2ae3dbf9fc2b',
  'SMS_API_BASE_URL': 'https://smslenz.lk',
  'SMS_API_KEY': '8762a0be-9a2f-47b1-b0ed-2ae3dbf9fc2b',
  'SMS_USER_ID': '868',
  'SMS_SENDER_ID': 'SMSlenzDEMO', // Any value is fine
};

console.log('📋 Current values:');
let allGood = true;

for (const [key, expected] of Object.entries(required)) {
  const value = process.env[key];
  if (!value) {
    console.error(`❌ ${key}: NOT SET`);
    allGood = false;
  } else if (expected && value !== expected) {
    console.warn(`⚠️  ${key}: ${value.substring(0, 20)}... (expected: ${expected.substring(0, 20)}...)`);
    if (key === 'API_KEY') {
      allGood = false;
    }
  } else {
    console.log(`✅ ${key}: ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`);
  }
}

console.log('\n📋 Other values:');
['PORT', 'MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'].forEach(key => {
  const value = process.env[key];
  if (value) {
    console.log(`✅ ${key}: Set`);
  } else {
    console.warn(`⚠️  ${key}: Not set (optional)`);
  }
});

console.log('\n');

if (!allGood) {
  console.error('❌ Configuration issues found!');
  console.error('\n📝 Fix:');
  console.error('   1. Make sure .env file has correct API_KEY');
  console.error('   2. Restart server: npm start');
  console.error('   3. Test again: node test-otp.js +94751300023');
  process.exit(1);
}

console.log('✅ All required values are set correctly!');
console.log('\n💡 Next steps:');
console.log('   1. Make sure server is running: npm start');
console.log('   2. Test OTP: node test-otp.js +94751300023');
console.log('');

