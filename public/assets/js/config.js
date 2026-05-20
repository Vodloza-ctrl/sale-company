window.SALE_CONFIG = {
  apiBase: "https://sale-company-api.yasibomedia.workers.dev",
  supabaseUrl: "",
  supabaseAnonKey: "",
  whatsappNumber: "263XXXXXXXXX",
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
