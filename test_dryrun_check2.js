async function test() {
  const res = await fetch("http://localhost:3001/api/dry-run");
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response (500 chars):", text.substring(0, 500));
}
test();