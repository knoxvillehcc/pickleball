async function test() {
  const res = await fetch("http://localhost:3001/api/dry-run", {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({})
  });
  const data = await res.json();
  const results = data.data;
  const summary = data.summary;
  
  console.log("=== SUMMARY ===");
  console.log("Active Subs:", summary.totalActiveSubscriptions);
  console.log("POS Sub Orders:", summary.posOrdersWithSubs);
  console.log("Valid (Skipped):", summary.skipped);
  console.log("Missing Subs:", summary.wouldFix);
  
  console.log("\n=== FIRST 5 RECORDS ===");
  results.slice(0,5).forEach(r => {
    console.log(`${r.customerName} | ${r.posOrder} | ${r.product} | $${r.amount} | ${r.status}`);
  });
  
  console.log("\n=== WOULD_FIX RECORDS ===");
  const toFix = results.filter(r => r.status === 'would_fix');
  console.log("Count:", toFix.length);
  toFix.slice(0,3).forEach(r => {
    console.log(`  -> ${r.customerName} | ${r.product} | $${r.amount}`);
  });
}
test();