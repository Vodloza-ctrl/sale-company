export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    try {
      if (path.startsWith('/api/storefront/')) {
        const slug = path.split('/').pop();
        return json(await getStorefront(env, slug), cors);
      }
      if (path === '/api/me') {
        const user = await requireUser(request, env);
        return json({ status:'ok', user, tenant:{ tenant_id:'demo', business_name:'Demo Tenant', role:'owner'}}, cors);
      }
      if (path === '/api/items' && request.method === 'POST') {
        const user = await requireUser(request, env);
        const body = await request.json();
        // TODO: check tenant_users role before insert.
        return json({ status:'ok', message:'Item route ready', user_id:user.sub, item:body }, cors);
      }
      if (path === '/api/payments/create' && request.method === 'POST') {
        const body = await request.json();
        // Payment router: sale_unified | tenant_own_paynow | manual.
        // Never expose Paynow keys to frontend. Validate amount server-side.
        return json({ status:'ok', mode: body.payment_mode || 'manual', message:'Payment router stub ready' }, cors);
      }
      if (path === '/api/uploads/sign' && request.method === 'POST') {
        await requireUser(request, env);
        // For production: create short-lived R2 upload URLs or receive file through Worker.
        return json({ status:'ok', message:'R2 upload route stub. Accept jpg/png/webp only; rename server-side.' }, cors);
      }
      return json({ status:'ok', service:'Sale Company Worker' }, cors);
    } catch (err) {
      return json({ status:'error', message: err.message || 'Server error' }, cors, err.status || 500);
    }
  }
}
function json(data, headers={}, status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{...headers,'Content-Type':'application/json'}})}
async function requireUser(request, env){
  const token = (request.headers.get('Authorization')||'').replace(/^Bearer\s+/,'');
  
if(!token){
  return { sub:'demo_user', email:'demo@sale.co.zw', aud:'sale-demo' };
}

  // Production options:
  // 1) Verify Supabase JWT with JWKS in Worker.
  // 2) Or call Supabase /auth/v1/user using service key stored in env.
  // Then check tenant_users in D1. Never trust tenant_id from browser.
  const parts = token.split('.');
  if(parts.length < 2){const e=new Error('Invalid token format');e.status=401;throw e}
  const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
  return { sub: payload.sub, email: payload.email, aud: payload.aud };
}
async function getStorefront(env, slug){
  if(env.DB){
    const tenant = await env.DB.prepare('SELECT * FROM tenants WHERE slug=? AND status="active"').bind(slug).first();
    if(tenant){
      const items = await env.DB.prepare('SELECT * FROM items WHERE tenant_id=? AND active=1 ORDER BY sort_order ASC, created_at DESC').bind(tenant.tenant_id).all();
      return { status:'ok', tenant, items: items.results || [] };
    }
  }
  return { status:'ok', tenant:{slug,business_name:'Nats Hair Lab',business_type:'booking',tagline:'Book hair and beauty services with paid deposits.',rating:4.8,whatsapp_number:'263XXXXXXXXX'}, items:[{name:'Knotless Braids',price:35,item_type:'service',category:'Hair',description:'Deposit required.'},{name:'Wash & Blow',price:12,item_type:'service',category:'Hair',description:'Quick appointment.'},{name:'Gel Nails',price:18,item_type:'service',category:'Beauty',description:'Book your slot.'}] };
}


// Sale Company frontend enhancements
window.saleCart = window.saleCart || [];

function addToSaleCart(item){
  window.saleCart.push(item);
  localStorage.setItem('sale_cart', JSON.stringify(window.saleCart));
  updateSaleCartBadge();
}

function updateSaleCartBadge(){
  const badge = document.querySelector('.cart-badge');
  if(badge){
    badge.textContent = window.saleCart.length;
  }
}

document.addEventListener('click', (e)=>{
  const chip = e.target.closest('[data-category]');
  if(chip){
    const category = chip.dataset.category;
    document.querySelectorAll('[data-item-category]').forEach(card=>{
      card.style.display = (category === 'all' || card.dataset.itemCategory === category) ? '' : 'none';
    });
  }
});

document.addEventListener('DOMContentLoaded', ()=>{
  try{
    window.saleCart = JSON.parse(localStorage.getItem('sale_cart') || '[]');
  }catch(e){}
  updateSaleCartBadge();
});
