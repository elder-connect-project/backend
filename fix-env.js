// Fix .env file - add missing keys
// Run: node fix-env.js

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  console.error('📝 Run: node setup-env.js');
  process.exit(1);
}

console.log('🔧 Fixing .env file...\n');

// Read existing .env
let envContent = fs.readFileSync(envPath, 'utf8');

// Required keys with defaults
const requiredKeys = {
  'API_KEY': '8762a0be-9a2f-47b1-b0ed-2ae3dbf9fc2b',
  'SMS_PROVIDER': 'smslenz',
  'SMS_API_BASE_URL': 'https://smslenz.lk',
  'SMS_API_KEY': '8762a0be-9a2f-47b1-b0ed-2ae3dbf9fc2b',
  'SMS_USER_ID': '868',
  'SMS_SENDER_ID': 'SMSlenzDEMO',
  'PORT': '5000',
  'NODE_ENV': 'development',
  'MONGODB_URI': 'mongodb://localhost:27017/elderconnect',
  'JWT_SECRET': 'change_me_jwt_secret_123',
  'JWT_REFRESH_SECRET': 'change_me_refresh_secret_456',
  'OTP_TTL_MS': '300000',
};

let updated = false;
const lines = envContent.split('\n');
const existingKeys = new Set();

// Parse existing keys
lines.forEach(line => {
  const match = line.match(/^([^#=]+)=/);
  if (match) {
    existingKeys.add(match[1].trim());
  }
});

// Add missing keys
console.log('📝 Adding/Updating keys:\n');

for (const [key, defaultValue] of Object.entries(requiredKeys)) {
  if (!existingKeys.has(key)) {
    // Add new key
    envContent += `\n${key}=${defaultValue}`;
    console.log(`✅ Added: ${key}=${defaultValue}`);
    updated = true;
  } else {
    // Check if value is empty or placeholder
    const regex = new RegExp(`^${key}=(.+)$`, 'm');
    const match = envContent.match(regex);
    if (match && (match[1].trim() === '' || match[1].includes('YOUR_') || match[1].includes('change_me'))) {
      // Update placeholder value
      envContent = envContent.replace(regex, `${key}=${defaultValue}`);
      console.log(`✅ Updated: ${key}=${defaultValue}`);
      updated = true;
    } else {
      console.log(`✓ Already set: ${key}`);
    }
  }
}

if (updated) {
  fs.writeFileSync(envPath, envContent);
  console.log('\n✅ .env file updated successfully!');
  console.log('\n📝 Next steps:');
  console.log('   1. Update SMS_SENDER_ID with your approved Sender ID from SMSlenz.lk');
  console.log('   2. Restart server: npm start');
  console.log('   3. Test: node test-otp.js +94751300023\n');
} else {
  console.log('\n✅ All required keys are already set!\n');
}

