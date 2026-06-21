async function test() {
  const res  = await fetch("http://localhost:3001/api/banner");
  const data = await res.json();
  console.log("Stats:", JSON.stringify(data.stats));
  (data.results||[]).forEach(r => console.log(`${r.customerName} | ${r.date} | $${r.amount} | STATUS: ${r.statusLabel}`));
}
test();