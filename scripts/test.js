const https = require('https');
const data = JSON.stringify({
  chat_id: 1116586454,
  text: 'Hey Adritanya! Your Content Agent bot is working! 🎉'
});
const options = {
  hostname: 'api.telegram.org',
  path: '/bot7848388893:AAHK0Zca17Y99l5HtIfBgb6r5WFtD4BABpQ/sendMessage',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};
const req = https.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log(body));
});
req.on('error', e => console.log('ERROR:', e.message));
req.write(data);
req.end();