window.SALE_CONFIG = {
  apiBase: "https://sale-company-api.yasibomedia.workers.dev",
  supabaseUrl: "",
  supabaseAnonKey: "",
  whatsappNumber: "263713321211",
  assetsBase: "https://assets.sale.co.zw",
  demoTenant: "nats-hair-lab"
};


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


window.SALE_CONFIG.demoAuthToken =
"eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkZW1vX3VzZXIiLCJlbWFpbCI6ImRlbW9Ac2FsZS5jby56dyIsImF1ZCI6InNhbGUtZGVtbyJ9.signature";

function saleSetDemoSession(){
  localStorage.setItem('sale_auth_token', window.SALE_CONFIG.demoAuthToken);
  localStorage.setItem('sale_logged_in', 'true');
}

function saleGetToken(){
  return localStorage.getItem('sale_auth_token') || window.SALE_CONFIG.demoAuthToken;
}
