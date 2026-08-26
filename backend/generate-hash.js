const bcrypt = require('bcryptjs');

async function generateHash() {
    const password = 'superadmin123';
    const hash = await bcrypt.hash(password, 10);
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('Hash length:', hash.length);
    
    // Verify
    const isValid = await bcrypt.compare(password, hash);
    console.log('Verify result:', isValid);
    
    process.exit(0);
}

generateHash();