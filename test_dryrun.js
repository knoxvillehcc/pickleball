async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/dry-run", { method: "POST" });
    const data = await res.json();
    console.log(JSON.stringify(data.summary, null, 2));
    console.log("Total records returned:", data.data.length);
    if(data.data.length > 0) {
      console.log("Sample records:");
      console.log(data.data.slice(0, 3));
    }
  } catch (e) {
    console.error(e);
  }
}
test();