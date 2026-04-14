const http = require('http');

// First, create a new tutor
function createNewTutor() {
  const signupData = JSON.stringify({
    email: "newtutortest@example.com",
    password: "password123",
    firstName: "Alice",
    lastName: "Smith",
    subjects: ["English", "History"],
    hourlyRate: 40,
    bio: "English and history tutor"
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/tutor/signup',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': signupData.length
    }
  };

  console.log('📝 Creating NEW tutor account...\n');
  
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('SIGNUP STATUS:', res.statusCode);
        
        if (res.statusCode === 201) {
          console.log('✅ Account created successfully!');
          console.log('✅ Email:', response.user.email);
          console.log('✅ Name:', response.user.firstName + ' ' + response.user.lastName);
          console.log('━'.repeat(50));
          
          // Now test login with the same credentials
          setTimeout(() => testLoginWithNewAccount(), 1000);
        } else {
          console.log('❌ Error:', response.message);
        }
      } catch (e) {
        console.error('Parse error:', e.message);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Connection error: ${e.message}`);
  });

  req.write(signupData);
  req.end();
}

// Test login with the newly created account
function testLoginWithNewAccount() {
  const loginData = JSON.stringify({
    email: "newtutortest@example.com",
    password: "password123"
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/tutor/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  };

  console.log('\n🔐 Testing login with newly created account...\n');
  
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('LOGIN RESPONSE STATUS:', res.statusCode);
        console.log('━'.repeat(50));
        
        if (res.statusCode === 200) {
          console.log('✅ LOGIN SUCCESSFUL!');
          console.log('✅ Status:', response.message);
          console.log('✅ Email:', response.user.email);
          console.log('✅ Role:', response.user.role);
          console.log('✅ Name:', response.user.firstName + ' ' + response.user.lastName);
          console.log('✅ Token:', response.token.substring(0, 50) + '...');
          console.log('━'.repeat(50));
          console.log('\n🎉 TUTOR LOGIN IS WORKING PROPERLY!\n');
        } else {
          console.log('❌ Login failed:', response.message);
        }
      } catch (e) {
        console.error('Parse error:', e.message);
        console.log('Response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Connection error: ${e.message}`);
  });

  req.write(loginData);
  req.end();
}

createNewTutor();
