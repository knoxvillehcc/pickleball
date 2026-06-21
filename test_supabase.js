// Quick Supabase connectivity test
// Run with: node test_supabase.js

const SUPABASE_URL      = process.env.SUPABASE_URL      || 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

async function testSupabase() {
  console.log('\n🔍 Supabase Connection Test\n' + '─'.repeat(40));

  // Check 1: URL
  if (SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
    console.log('❌ SUPABASE_URL is still a placeholder!');
    console.log('   Fix: Go to https://supabase.com/dashboard → Your Project → Settings → API');
    console.log('   Copy the "Project URL" (looks like: https://abcxyz123.supabase.co)');
    process.exit(1);
  }
  console.log(`✅ SUPABASE_URL set: ${SUPABASE_URL}`);

  // Check 2: Key format
  if (!SUPABASE_ANON_KEY) {
    console.log('❌ SUPABASE_ANON_KEY is missing!');
    process.exit(1);
  }
  if (!SUPABASE_ANON_KEY.startsWith('eyJ')) {
    console.log(`⚠️  SUPABASE_ANON_KEY looks wrong (starts with "${SUPABASE_ANON_KEY.slice(0,8)}...")`);
    console.log('   The anon key should start with "eyJ" (it\'s a JWT token)');
    console.log('   You may have entered a Personal Access Token (sbp_...) instead.');
    console.log('   Fix: Go to Supabase → Settings → API → copy "anon public" key');
    process.exit(1);
  }
  console.log(`✅ SUPABASE_ANON_KEY format looks correct (eyJ...)`);

  // Check 3: Live connection test
  try {
    console.log('\n📡 Testing live connection...');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations?limit=1&select=id`, {
      headers: {
        'apikey':        SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`✅ Connection SUCCESS! Table "registrations" is accessible.`);
      console.log(`   Records returned: ${data.length}`);
    } else {
      const body = await res.text();
      console.log(`❌ Connection FAILED — HTTP ${res.status}`);
      console.log(`   Response: ${body.slice(0, 300)}`);

      if (res.status === 401) {
        console.log('\n   Tip: Invalid API key. Make sure you copied the "anon public" key from Supabase Settings → API');
      } else if (res.status === 404) {
        console.log('\n   Tip: Table "registrations" not found. Make sure the table was created in Supabase.');
      }
    }
  } catch (err) {
    console.log(`❌ Network error: ${err.message}`);
    console.log('   Check your SUPABASE_URL is correct.');
  }
}

testSupabase();
