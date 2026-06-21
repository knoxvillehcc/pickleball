async function test() {
  // Follow the redirect chain to find the real URL
  const res = await fetch("https://knoxsub.odoo.com/web/login", { redirect: 'follow' });
  console.log("Final URL:", res.url);
  console.log("Status:", res.status);
}
test();