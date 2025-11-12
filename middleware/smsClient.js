const axios = require('axios');

async function sendSms({ to, message }) {
  const baseUrl = process.env.SMS_API_BASE_URL;
  const apiKey = process.env.SMS_API_KEY;
  const userId = process.env.SMS_USER_ID;

  if (!baseUrl || !apiKey || !userId) {
    const missing = [];
    if (!baseUrl) missing.push('https://smslenz.lk/api');
    if (!apiKey) missing.push('8762a0be-9a2f-47b1-b0ed-2ae3dbf9fc2b');
    if (!userId) missing.push('868');
    throw new Error(`SMS API config missing: ${missing.join(', ')}`);
  }

  // Validate phone number format (should start with +)
  if (!to || !to.startsWith('+')) {
    throw new Error('Invalid phone number format. Must include country code (e.g., +94XXXXXXXXX)');
  }

  // SMSlenz.lk API format
  const provider = process.env.SMS_PROVIDER || 'smslenz';
  const senderId = process.env.SMS_SENDER_ID  || 'SMSlenzDEMO';
  
  if (!senderId && provider === 'smslenz') {
    throw new Error('SMS_SENDER_ID is required for SMSlenz.lk');
  }

  let url, headers, payload;

  if (provider === 'smslenz') {
    // SMSlenz.lk API format: POST with params in body
    url = `${baseUrl.replace(/\/$/, '')}/api/send-sms`;
    headers = {
      'Content-Type': 'application/json',
    };
    payload = {
      user_id: userId,
      api_key: apiKey,
      sender_id: senderId,
      contact: to,
      message: message,
    };
  } else {
    // Generic API format (for other providers)
    const endpoint = process.env.SMS_API_ENDPOINT || '/messages';
    url = `${baseUrl.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    
    headers = {
      'Content-Type': 'application/json',
    };

    const authType = process.env.SMS_AUTH_TYPE || 'bearer';
    if (authType === 'bearer') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (authType === 'apikey') {
      headers['x-api-key'] = apiKey;
    } else if (authType === 'header') {
      headers[process.env.SMS_AUTH_HEADER || 'Authorization'] = apiKey;
    }

    if (process.env.SMS_INCLUDE_USER_ID !== 'false') {
      headers['x-user-id'] = userId;
    }

    payload = {
      to: to,
      message: message,
      ...(process.env.SMS_FROM && { from: process.env.SMS_FROM }),
      ...(senderId && { senderId: senderId }),
    };
  }

  // Log request for debugging (without sensitive data)
  console.log('[SMS REQUEST]', {
    url,
    to: to.replace(/\d(?=\d{4})/g, '*'), // Mask phone number
    messageLength: message.length,
    hasAuth: !!headers.Authorization || !!headers['x-api-key'],
  });

  try {
    const res = await axios.post(url, payload, { 
      headers, 
      timeout: parseInt(process.env.SMS_TIMEOUT_MS) || 10000,
      validateStatus: (status) => status < 500, // Don't throw on 4xx
    });
    
    // Log response
    console.log('[SMS RESPONSE]', {
      status: res.status,
      data: res.data,
    });

    // Check if response indicates success
    if (res.status >= 200 && res.status < 300) {
      return res.data;
    } else {
      // 4xx errors - provider rejected the request
      const errorMsg = res.data?.message || res.data?.error || `HTTP ${res.status}`;
      throw new Error(`SMS provider rejected request: ${errorMsg}`);
    }
  } catch (err) {
    // Network errors or 5xx errors
    if (err.response) {
      const status = err.response.status;
      const data = err.response.data;
      const errorMsg = data?.message || data?.error || JSON.stringify(data) || err.message;
      console.error('[SMS ERROR]', {
        status,
        url,
        error: errorMsg,
        response: data,
      });
      throw new Error(`SMS send failed (${status}): ${errorMsg}`);
    } else if (err.request) {
      // Request was made but no response received
      console.error('[SMS ERROR]', {
        url,
        error: 'No response from SMS provider',
        message: err.message,
      });
      throw new Error(`SMS provider unreachable: ${err.message}`);
    } else {
      // Error setting up request
      console.error('[SMS ERROR]', {
        url,
        error: err.message,
      });
      throw new Error(`SMS request failed: ${err.message}`);
    }
  }
}

module.exports = { sendSms };

