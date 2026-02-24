import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lrnhrzpwgyhkruwxeppw.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxybmhyenB3Z3loa3J1d3hlcHB3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjYyODU0NiwiZXhwIjoyMDYyMjA0NTQ2fQ.rS_tTVI8oxoJ_fjvtfTuhJG_ZtwRuxqwOSdqrG3Yhnk';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function queryJobs() {
  console.log('\n=== Querying public.staffing_jobs ===\n');

  // Test 1: Get count
  console.log('1. Getting row count...');
  const { data: countData, error: countError } = await supabase
    .rpc('get_staffing_jobs_count');
  
  if (countError) {
    console.log('   ❌ Error:', countError.message);
  } else {
    console.log(`   ✅ Row count: ${countData}`);
  }

  // Test 2: Query via RPC
  console.log('\n2. Querying via RPC (get_staffing_jobs)...');
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_staffing_jobs');
  
  if (rpcError) {
    console.log('   ❌ Error:', rpcError.message);
  } else if (Array.isArray(rpcData)) {
    console.log(`   ✅ Records returned: ${rpcData.length}`);
    if (rpcData.length > 0) {
      console.log('\n   First record:');
      console.log(JSON.stringify(rpcData[0], null, 2));
    }
  }

  // Test 3: Query via table
  console.log('\n3. Querying via table (public.staffing_jobs)...');
  const { data: tableData, error: tableError } = await supabase
    .from('staffing_jobs')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (tableError) {
    console.log('   ❌ Error:', tableError.message);
    console.log('   Details:', tableError.details);
  } else if (Array.isArray(tableData)) {
    console.log(`   ✅ Records returned: ${tableData.length}`);
    if (tableData.length > 0) {
      console.log('\n   First record:');
      console.log(JSON.stringify(tableData[0], null, 2));
    }
  }

  // Test 4: Check with limit
  console.log('\n4. Querying with limit(5)...');
  const { data: limitData, error: limitError } = await supabase
    .from('staffing_jobs')
    .select('id, title, location, created_at')
    .limit(5);
  
  if (limitError) {
    console.log('   ❌ Error:', limitError.message);
  } else {
    console.log(`   ✅ Records returned: ${limitData?.length || 0}`);
    if (Array.isArray(limitData) && limitData.length > 0) {
      console.log('\n   Results:');
      limitData.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.title} (${row.location}) - ${row.id}`);
      });
    }
  }

  console.log('\n=== Query Complete ===\n');
}

queryJobs().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
