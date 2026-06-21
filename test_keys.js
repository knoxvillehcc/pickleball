async function test() {
  const res = await fetch("http://localhost:3001/api/dry-run", {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({})
  });
  const data = await res.json();
  console.log("Keys in response:", Object.keys(data));
  console.log("Has 'results':", !!data.results);
  console.log("Has 'data':", !!data.data);
  console.log("data.data length:", data.data?.length);
  console.log("Summary:", JSON.stringify(data.summary));
  if(data.data && data.data.length > 0) console.log("Sample row:", JSON.stringify(data.data[0]));
}
test();