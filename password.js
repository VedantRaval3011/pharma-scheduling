// save this as hash.js and run with: node hash.js
const bcrypt = require('bcryptjs');

const password = '123456789';
bcrypt.hash(password, 10).then((hashed) => {
  console.log('Hashed Password:', hashed);
});
