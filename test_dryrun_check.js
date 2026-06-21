async function test() {
  try {
    const res = await fetch("http://localhost:3001/api/dry-run");
    const data = await res.json();
    console.log("Success:", data.success);
    console.log("Error:", data.error);
    console.log("Results count:", data.results?.length);
    console.log("Summary:", JSON.stringify(data.summary));
  } catch(e) {
    console.log("Fetch error:", e.message);
  }
}
test();