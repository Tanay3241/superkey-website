const http = require('http');

function checkServerStatus() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000/api/test', (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Server is running');
        resolve(true);
      } else {
        console.error('❌ Server returned status:', res.statusCode);
        reject(new Error(`Server returned status: ${res.statusCode}`));
      }
    }).on('error', (err) => {
      console.error('❌ Server check failed:', err.message);
      reject(err);
    });
  });
}

module.exports = { checkServerStatus };