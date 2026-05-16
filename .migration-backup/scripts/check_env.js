const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('SUPABASE_PROJECT_URL:', process.env.SUPABASE_PROJECT_URL ? 'EXISTS' : 'MISSING');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'EXISTS (' + process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10) + '...)' : 'MISSING');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'EXISTS' : 'MISSING');
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'EXISTS' : 'MISSING');
