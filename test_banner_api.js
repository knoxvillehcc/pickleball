async function test() {
  try {
    // Test via the live Next.js server since odooClient is ESM
    const res = await fetch("http://localhost:3001/api/reports");
    const data = await res.json();
    console.log("Reports API works:", data.success);
    console.log("Result count:", data.results?.length);
  } catch(e) {
    console.log("Error:", e.message);
  }
}
test();