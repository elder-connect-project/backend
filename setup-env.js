// Setup .env file generator
// Run: node setup-env.js

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
  console.log('⚠️  .env file already exists!');
  console.log('   To update missing keys, run: node fix-env.js');
  console.log('   To regenerate, delete .env file first.\n');
  process.exit(0);
}

const envContent = `# Backend API Key (for protecting OTP endpoints)
API_KEY=8762a0be-9a2f-47b1-b0ed-2ae3dbf9fc2b

# SMSlenz.lk Configuration
SMS_PROVIDER=smslenz
SMS_API_BASE_URL=https://smslenz.lk
SMS_API_KEY=8762a0be-9a2f-47b1-b0ed-2ae3dbf9fc2b
SMS_USER_ID=868
SMS_SENDER_ID=SMSlenzDEMO

# Server
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/elderconnect

# JWT Secrets (change these!)
JWT_SECRET=change_me_jwt_secret_123
JWT_REFRESH_SECRET=change_me_refresh_secret_456

# OTP Settings
OTP_TTL_MS=300000
`;

fs.writeFileSync(envPath, envContent);
console.log('✅ .env file created successfully!');
console.log('\n📝 Next steps:');
console.log('   1. Update SMS_SENDER_ID with your approved Sender ID from SMSlenz.lk');
console.log('   2. Change JWT_SECRET and JWT_REFRESH_SECRET to secure values');
console.log('   3. Restart server: npm start');
console.log('   4. Test: node test-otp.js\n');

