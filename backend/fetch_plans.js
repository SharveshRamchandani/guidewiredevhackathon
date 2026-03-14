const http = require('http');

http.get('http://localhost:5000/api/policy/plans', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('PLANS:', data));
}).on('error', err => console.error(err));
