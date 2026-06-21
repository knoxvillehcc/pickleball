// Using native fetch in Node.js 18+

async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/pickleball/registrations');
    console.log('Status Code:', res.status);
    console.log('Headers:', [...res.headers.entries()]);
    const text = await res.text();
    console.log('Response Body snippet:', text.slice(0, 500));
  } catch (e) {
    console.error('Error fetching:', e);
  }
}

run();
