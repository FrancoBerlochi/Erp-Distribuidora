const https = require('https');

async function main() {
  const publicUrls = [
    'https://erp-distribuidora-five.vercel.app/',
    'https://erp-distribuidora-five.vercel.app/productos',
    'https://erp-distribuidora-five.vercel.app/catalogo',
    'https://erp-distribuidora-five.vercel.app/ofertas',
    'https://erp-distribuidora-five.vercel.app/cart',
    'https://erp-distribuidora-five.vercel.app/login',
    'https://erp-distribuidora-five.vercel.app/dashboard',
    'https://erp-distribuidora-five.vercel.app/dashboard/products',
    'https://erp-distribuidora-five.vercel.app/dashboard/pos',
    'https://erp-distribuidora-five.vercel.app/dashboard/caja',
    'https://erp-distribuidora-five.vercel.app/dashboard/clientes',
    'https://erp-distribuidora-five.vercel.app/dashboard/proveedores',
    'https://erp-distribuidora-five.vercel.app/dashboard/categorias',
    'https://erp-distribuidora-five.vercel.app/dashboard/reportes',
    'https://erp-distribuidora-five.vercel.app/dashboard/rentabilidad',
    'https://erp-distribuidora-five.vercel.app/dashboard/vencimientos',
    'https://erp-distribuidora-five.vercel.app/dashboard/etiquetas'
  ];

  console.log('=== 1. VERIFICACIÓN DE PÁGINAS Y RUTAS EN VERCEL ===');
  for (const url of publicUrls) {
    try {
      const res = await fetch(url, { method: 'GET' });
      const text = await res.text();
      const hasError = text.includes('Application error') || text.includes('Internal Server Error');
      const pathname = new URL(url).pathname;
      if (res.status === 200 && !hasError) {
        console.log(`[PASS] [200] ${pathname} (${text.length} bytes)`);
      } else {
        console.log(`[FAIL] [${res.status}] ${pathname}`);
      }
    } catch (e) {
      console.log(`[FAIL] ERROR en ${url}: ${e.message}`);
    }
  }

  console.log('\n=== 2. VERIFICACIÓN DE API PROXY (/api/products) ===');
  for (const type of ['all', 'admin', 'discounted']) {
    try {
      const res = await fetch(`https://erp-distribuidora-five.vercel.app/api/products?type=${type}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        console.log(`[PASS] /api/products?type=${type} -> 200 OK (${data.length} productos cargados)`);
      } else {
        console.log(`[FAIL] /api/products?type=${type} -> ${JSON.stringify(data)}`);
      }
    } catch (e) {
      console.log(`[FAIL] ERROR en /api/products?type=${type}: ${e.message}`);
    }
  }

  console.log('\n=== 3. VERIFICACIÓN DE AUTENTICACIÓN Y BASE DE DATOS SUPABASE ===');
  const authPayload = JSON.stringify({ email: 'francoberlochi@gmail.com', password: 'ulisesdebonis' });
  const authRes = await new Promise((resolve) => {
    const req = https.request({
      hostname: '104.18.38.10',
      port: 443,
      path: '/auth/v1/token?grant_type=password',
      method: 'POST',
      headers: {
        'Host': 'myyjdhijtknbxhdjhmmu.supabase.co',
        'apikey': 'sb_publishable_4NVPc5QMeeuWnZJnhikgow_72Imnjlp',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(authPayload)
      },
      servername: 'myyjdhijtknbxhdjhmmu.supabase.co'
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(d) });
        } catch {
          resolve({ status: res.statusCode, data: d });
        }
      });
    });
    req.write(authPayload);
    req.end();
  });

  if (authRes.status === 200 && authRes.data.access_token) {
    console.log('[PASS] Autenticación exitosa! Usuario verificado:', authRes.data.user.email);
    const token = authRes.data.access_token;

    const tables = ['products', 'customers', 'suppliers', 'orders', 'cash_registers', 'invoices', 'profiles'];
    for (const t of tables) {
      const tRes = await new Promise((resolve) => {
        const req = https.request({
          hostname: '104.18.38.10',
          port: 443,
          path: `/rest/v1/${t}?select=count`,
          method: 'GET',
          headers: {
            'Host': 'myyjdhijtknbxhdjhmmu.supabase.co',
            'apikey': 'sb_publishable_4NVPc5QMeeuWnZJnhikgow_72Imnjlp',
            'Authorization': 'Bearer ' + token,
            'Prefer': 'count=exact'
          },
          servername: 'myyjdhijtknbxhdjhmmu.supabase.co'
        }, (res) => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => resolve({ status: res.statusCode, count: res.headers['content-range'] || d }));
        });
        req.end();
      });
      const tag = tRes.status < 400 ? '[PASS]' : '[WARN]';
      console.log(`${tag} Tabla '${t}': Status ${tRes.status} (Filas: ${tRes.count})`);
    }
  } else {
    console.log('[FAIL] Error de autenticación:', authRes);
  }
}

main();
