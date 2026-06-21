async function test() {
  try {
    const res = await fetch("http://localhost:3001/api/reports");
    const data = await res.json();
    console.log("Full response:", JSON.stringify(data));
  } catch(e) {
    console.log("Error:", e.message);
  }
}
test();