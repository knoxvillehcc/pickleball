async function test() {
  const res  = await fetch("http://localhost:3001/api/banner");
  const data = await res.json();
  console.log("Success:", data.success);
  if (data.error) console.log("Error:", data.error);
  console.log("Stats:", JSON.stringify(data.stats));
  console.log("\nAll records:");
  (data.results || []).forEach(r => {
    console.log(`[${r.source}] ${r.customerName} | ${r.date} | ${r.product} | $${r.amount} | by: ${r.takenBy} | ${r.paymentState || 'paid'}`);
  });
}
test();