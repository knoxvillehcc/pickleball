const crypto = require('crypto');
const JWT='8bc4a6a38ebbb420fde5e960d8077dec1e655304ab4f7b0c9cb2f014c77d80f1630927876711e8cb11a2224fa56051b27725d191721084fb7ed4200f9670b8db';
const SU='https://wkyzejotrcraluextvpc.supabase.co';
const SK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreXplam90cmNyYWx1ZXh0dnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTk5ODU1MywiZXhwIjoyMDk3NTc0NTUzfQ.VMMXPaH5fb4x5H5YEPsNT9_ekxA1dKLFK8nHyQDjE-A';

async function main(){
  const r=await fetch(SU+'/rest/v1/pickleball_settings?key=eq.odoo_creds&select=value&limit=1',{headers:{apikey:SK,Authorization:'Bearer '+SK}});
  const rows=await r.json();const t=rows[0].value;const p=t.split(':');const iv=Buffer.from(p.shift(),'hex');const e2=Buffer.from(p.join(':'),'hex');
  const k=crypto.createHash('sha256').update(JWT).digest();const d=crypto.createDecipheriv('aes-256-cbc',k,iv);let dc=d.update(e2,'hex','utf8');dc+=d.final('utf8');const creds=JSON.parse(dc);
  const url=creds.url.replace(/\/$/,'')+'/jsonrpc';
  const auth=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',method:'call',params:{service:'common',method:'authenticate',args:[creds.db,creds.username,creds.password,{}]}})});
  const uid=(await auth.json()).result;
  async function call(model,method,args,kwargs={}){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',method:'call',params:{service:'object',method:'execute_kw',args:[creds.db,uid,creds.password,model,method,args,kwargs]}})});const d=await r.json();if(d.error)throw new Error(d.error.data?.message);return d.result}

  // Test from info@ via Gmail-Info server
  console.log('=== Test: Send from info@ via Gmail-Info (server 4) ===');
  const mailId1 = await call('mail.mail','create',[{
    subject: 'Test A - From Info via Gmail-Info',
    body_html: '<p>Test from info.knoxvillemandir via Gmail-Info server</p>',
    email_from: '"HCC General" <info.knoxvillemandir@gmail.com>',
    email_to: 'hp4096@yahoo.com',
    auto_delete: false,
    mail_server_id: 4,
  }]);
  console.log('Created ID:', mailId1);
  await call('mail.mail','send',[mailId1]);
  const r1 = await call('mail.mail','search_read',[[['id','=',mailId1]]],{fields:['id','state','failure_reason','mail_server_id']});
  console.log('Result:', JSON.stringify(r1));

  // Test auto-pick (no server specified, from info@)
  console.log('\n=== Test: Auto-pick server (from info@) ===');
  const mailId2 = await call('mail.mail','create',[{
    subject: 'Test B - Auto Pick Server',
    body_html: '<p>Test letting Odoo pick server automatically</p>',
    email_from: '"HCC General" <info.knoxvillemandir@gmail.com>',
    email_to: 'hp4096@yahoo.com',
    auto_delete: false,
  }]);
  console.log('Created ID:', mailId2);
  await call('mail.mail','send',[mailId2]);
  const r2 = await call('mail.mail','search_read',[[['id','=',mailId2]]],{fields:['id','state','failure_reason','mail_server_id']});
  console.log('Result:', JSON.stringify(r2));

  // Test to knoxvillehcc@gmail.com
  console.log('\n=== Test: Send to knoxvillehcc@gmail.com ===');
  const mailId3 = await call('mail.mail','create',[{
    subject: 'Test C - To Gmail Inbox',
    body_html: '<p>If you see this in knoxvillehcc@gmail.com, email is working!</p>',
    email_from: '"HCC General" <info.knoxvillemandir@gmail.com>',
    email_to: 'knoxvillehcc@gmail.com',
    auto_delete: false,
  }]);
  console.log('Created ID:', mailId3);
  await call('mail.mail','send',[mailId3]);
  const r3 = await call('mail.mail','search_read',[[['id','=',mailId3]]],{fields:['id','state','failure_reason','mail_server_id']});
  console.log('Result:', JSON.stringify(r3));
}
main().catch(e=>console.error('Error:',e.message));
