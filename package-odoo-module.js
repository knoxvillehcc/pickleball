/**
 * package-odoo-module.js
 * Run: node package-odoo-module.js
 * Creates: hcc_pickleball.zip  (ready to upload to Odoo)
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC  = path.join(__dirname, 'odoo-module', 'hcc_pickleball');
const DEST = path.join(__dirname, 'hcc_pickleball.zip');

if (!fs.existsSync(SRC)) {
  console.error('❌  Module source not found at:', SRC);
  process.exit(1);
}

if (fs.existsSync(DEST)) fs.unlinkSync(DEST);

try {
  // Windows: use PowerShell Compress-Archive
  execSync(
    `powershell -Command "Compress-Archive -Path '${SRC}' -DestinationPath '${DEST}' -Force"`,
    { stdio: 'inherit' }
  );
  console.log('✅  Created:', DEST);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Log in to https://knoxmem.odoo.com');
  console.log('  2. Settings → Activate Developer Mode');
  console.log('  3. Apps → Upload Module → select hcc_pickleball.zip');
  console.log('  4. Install the "HCC Pickleball Registration" app');
} catch (e) {
  console.error('❌  Failed to create ZIP:', e.message);
  console.log('');
  console.log('Manual alternative: Right-click the odoo-module/hcc_pickleball folder');
  console.log('→ "Send to" → "Compressed (zipped) folder"');
  console.log('→ Rename to hcc_pickleball.zip');
}
