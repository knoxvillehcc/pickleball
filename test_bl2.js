async function test() {
  const res  = await fetch("http://localhost:3001/api/banner");
  const data = await res.json();
  console.log("Success:", data.success, "| Error:", data.error||"none");
  console.log("Stats:", JSON.stringify(data.stats));
  console.log("\nAll records:");
  (data.results||[]).forEach(r => console.log(`[${r.source}] ${r.customerName} | ${r.date} | $${r.amount} | by: ${r.takenBy}`));
}
test();