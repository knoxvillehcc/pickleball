async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/reports");
    const data = await res.json();
    console.log(JSON.stringify(data.summary, null, 2));
  } catch(e) {
    console.log("Error:", e.message);
  }
}
test();