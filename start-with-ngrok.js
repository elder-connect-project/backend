// Script to start backend server and ngrok tunnel together
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting backend server...');

// Start backend server
const backend = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

// Wait for backend to start, then start ngrok
setTimeout(() => {
  console.log('\n🌐 Starting ngrok tunnel...');
  console.log('📋 Your tunnel URL will appear below. Copy it and update ElderConnect/constants/api.ts\n');
  
  const ngrok = spawn('ngrok', ['http', '5000'], {
    stdio: 'inherit',
    shell: true
 });

  ngrok.on('error', (err) => {
    console.error('❌ Error starting ngrok:', err.message);
    console.log('\n💡 Make sure ngrok is installed: npm install -g ngrok');
    console.log('💡 And configured: ngrok config add-authtoken YOUR_TOKEN');
  });

  // Cleanup on exit
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    backend.kill();
    ngrok.kill();
    process.exit();
  });
}, 3000);

backend.on('error', (err) => {
  console.error('❌ Error starting backend:', err.message);
  process.exit(1);
});

