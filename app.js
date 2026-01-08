// WhatsApp da Fabiana: 69 99240-5075
// wa.me exige DDI + DDD + número sem espaços/traços
const WHATS_NUMBER = "5569992405075";

const fmtBRL = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const $ = (id) => document.getElementById(id);

let itens = [];
let categoriaAtual = "Todas";
let buscaAtual = "";

// carrinho: { [id]: { item, qty } }
let cart = {};

// Formata duração para exibir no card (ex: 90 -> "1h30", 45 -> "45min")
function formatDurationForItem(mins){
  if(!mins && mins !== 0) return '';
  if(mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${String(m).padStart(2,'0')}`;
}
// Formata duração total (regras: 0-59 -> "X min", 60+ -> "HhMM")
function formatDurationForTotal(mins){
  if(!mins && mins !== 0) return '0 min';
  if(mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${String(m).padStart(2,'0')}`;
}

function cartDurationMin(){
  return Object.values(cart).reduce((acc, x) => acc + (x.qty * (x.item.duracaoMin || 0)), 0);
}

function persistCart(){
  try{
    const map = {};
    Object.values(cart).forEach(({item, qty}) => { map[item.id] = qty; });
    localStorage.setItem('cart', JSON.stringify(map));
  }catch(e){/*ignore*/}
}
function loadCart(){
  try{
    const str = localStorage.getItem('cart');
    if(!str) return;
    const map = JSON.parse(str);
    Object.keys(map).forEach(k => {
      const id = parseInt(k, 10);
      const qty = map[k];
      const item = itens.find(x => x.id === id);
      if(item){ cart[id] = { item, qty }; }
    });
  }catch(e){/*ignore*/}
}

function showDateError(show){
  const dateEl = $('datePick');
  const timeEl = $('timePick');
  const err = $('dateError');
  if(show){
    if(dateEl) dateEl.classList.add('error');
    if(timeEl) timeEl.classList.add('error');
    if(err) { err.classList.add('show'); err.style.display = 'block'; }
  }else{
    if(dateEl) dateEl.classList.remove('error');
    if(timeEl) timeEl.classList.remove('error');
    if(err) { err.classList.remove('show'); err.style.display = 'none'; }
  }
} 

function buildWhatsLink(message){
  const text = encodeURIComponent(message);
  return `https://wa.me/${WHATS_NUMBER}?text=${text}`;
}

function uniqueCategories(items){
  const set = new Set(items.map(p => p.categoria));
  return ["Todas", ...Array.from(set).sort((a,b)=>a.localeCompare(b))];
}

function renderCategories(items){
  const select = $("category");
  select.innerHTML = "";
  uniqueCategories(items).forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
}

function filterItems(items){
  return items.filter(p => {
    const matchCat = (categoriaAtual === "Todas") || (p.categoria === categoriaAtual);
    const matchSearch = !buscaAtual || p.nome.toLowerCase().includes(buscaAtual);
    return matchCat && matchSearch;
  });
}

function cartCount(){
  return Object.values(cart).reduce((acc, x) => acc + x.qty, 0);
}

function cartTotal(){
  return Object.values(cart).reduce((acc, x) => acc + (x.qty * x.item.preco), 0);
}

function updateCartUI(){
  const cartCountEl = $("cartCount");
  if(cartCountEl) cartCountEl.textContent = cartCount();
  const barCountEl = $("barCount");
  if(barCountEl) barCountEl.textContent = cartCount();
  $("cartSubtitle").textContent = `${cartCount()} item(s)`;
  const cartTotalEl = $("cartTotal");
  if(cartTotalEl) cartTotalEl.textContent = fmtBRL(cartTotal());
  const barTotalEl = $("barTotal");
  if(barTotalEl) barTotalEl.textContent = fmtBRL(cartTotal());

  // Atualizar duração total
  const totalMin = cartDurationMin();
  const cartDurEl = $("cartDuration");
  if(cartDurEl) cartDurEl.textContent = formatDurationForTotal(totalMin);
  const barDurEl = $("barDuration");
  if(barDurEl) barDurEl.textContent = formatDurationForTotal(totalMin);

  const list = $("cartList");
  list.innerHTML = "";

  const entries = Object.values(cart);

  if(entries.length === 0){
    list.innerHTML = `<div class="muted">Seu carrinho está vazio.</div>`;
    $("sendWhats").disabled = true;
    $("sendWhats").style.opacity = "0.6";
    const barWhatsEl = $("barWhats");
    if(barWhatsEl){ barWhatsEl.disabled = true; barWhatsEl.style.opacity = "0.6"; }
    persistCart();
    return;
  }

  $("sendWhats").disabled = false;
  $("sendWhats").style.opacity = "1";
  const barWhatsEl = $("barWhats");
  if(barWhatsEl){ barWhatsEl.disabled = false; barWhatsEl.style.opacity = "1"; }

  entries.forEach(({item, qty}) => {
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <div class="cart-item-top">
        <div>
          <div class="cart-item-name">${item.nome}</div>
          <div class="cart-item-meta">${item.categoria} • ${fmtBRL(item.preco)} • ${formatDurationForItem(item.duracaoMin)}</div>
        </div>
        <div class="cart-item-name">${fmtBRL(item.preco * qty)}</div>
      </div>

      <div class="qty-row">
        <div class="muted">Qtd</div>
        <div class="qty-controls">
          <button class="qty-btn" data-dec="${item.id}" type="button">−</button>
          <div class="qty">${qty}</div>
          <button class="qty-btn" data-inc="${item.id}" type="button">+</button>
        </div>
      </div>
    `;
    list.appendChild(div);
  });

  list.querySelectorAll("[data-inc]").forEach(btn => {
    btn.addEventListener("click", () => addToCart(parseInt(btn.dataset.inc, 10)));
  });
  list.querySelectorAll("[data-dec]").forEach(btn => {
    btn.addEventListener("click", () => removeFromCart(parseInt(btn.dataset.dec, 10)));
  });

  // persistir estado
  persistCart();
} 

function addToCart(id){
  const item = itens.find(x => x.id === id);
  if(!item) return;

  if(!cart[id]) cart[id] = { item, qty: 0 };
  cart[id].qty += 1;

  updateCartUI();
}

function removeFromCart(id){
  if(!cart[id]) return;
  cart[id].qty -= 1;
  if(cart[id].qty <= 0) delete cart[id];

  updateCartUI();
}

function clearCart(){
  cart = {};
  updateCartUI();
}

function renderGrid(items){
  const grid = $("grid");
  grid.innerHTML = "";

  if(items.length === 0){
    grid.innerHTML = `<div class="muted">Nenhum item encontrado.</div>`;
    return;
  }

  items.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="thumb">
        <img src="${p.imagem}" alt="${p.nome}" class="thumb-img" loading="lazy" />
        ${p.tag ? `<span class="tag">${p.tag}</span>` : ``}
      </div>
      <div class="content">
        <div class="name">${p.nome}</div>
        <div class="muted">${p.categoria}</div>
        <div class="price">${fmtBRL(p.preco)} • ${formatDurationForItem(p.duracaoMin)}</div> 

        <div class="actions">
          <button class="btn" type="button" data-add="${p.id}">Adicionar</button>
          <button class="cta" type="button" data-add="${p.id}">+ Carrinho</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", () => addToCart(parseInt(btn.dataset.add, 10)));
  });
}

function openCart(){
  $("cartDrawer").classList.remove("hidden");
  $("cartDrawer").setAttribute("aria-hidden", "false");

  const dateEl = $('datePick');
  if(dateEl){
    // impedir datas passadas
    const today = new Date().toISOString().split('T')[0];
    dateEl.min = today;
  }

  // se houver itens, focar no campo de data
  if(cartCount() > 0){
    const date = $('datePick');
    const time = $('timePick');
    if(date && !date.value) { date.focus(); }
    else if(time && !time.value) { time.focus(); }
  }
} 
function closeCart(){
  $("cartDrawer").classList.add("hidden");
  $("cartDrawer").setAttribute("aria-hidden", "true");
}

function buildWhatsMessage(){
  const name = $("clientName").value.trim();
  const notes = $("notes").value.trim();
  const date = $("datePick").value;
  const time = $("timePick").value;

  const lines = [];
  lines.push("Olá! Vim pelo site e gostaria de agendar:");
  lines.push("");

  Object.values(cart).forEach(({item, qty}) => {
    const dur = formatDurationForItem(item.duracaoMin);
    lines.push(`• ${qty}x ${item.nome} — ${fmtBRL(item.preco)} (${dur})`);
  });

  lines.push("");
  lines.push(`Total: ${fmtBRL(cartTotal())}`);
  lines.push(`Duração estimada: ${formatDurationForTotal(cartDurationMin())}`);

  if(date && time){
    const [y,m,d] = date.split('-');
    lines.push("");
    lines.push(`Data: ${d}/${m}/${y}`);
    lines.push(`Horário: ${time}`);
  }

  if(name){
    lines.push("");
    lines.push(`Nome: ${name}`);
  }
  if(notes){
    lines.push("");
    lines.push(`Obs: ${notes}`);
  }

  return lines.join("\n");
}

async function init(){
  $("year").textContent = new Date().getFullYear();

  const res = await fetch("itens.json");
  itens = await res.json();

  renderCategories(itens);
  renderGrid(itens);

  // restaurar carrinho do localStorage (se houver)
  loadCart();
  updateCartUI();

  // restaurar date/time da sessão (se houver)
  const dateEl = $("datePick");
  const timeEl = $("timePick");
  if(dateEl){
    const savedDate = sessionStorage.getItem('cart_datePick');
    if(savedDate) dateEl.value = savedDate;
    dateEl.min = new Date().toISOString().split('T')[0];
    dateEl.addEventListener('change', (e) => { sessionStorage.setItem('cart_datePick', e.target.value); showDateError(false); });
  }
  if(timeEl){
    const savedTime = sessionStorage.getItem('cart_timePick');
    if(savedTime) timeEl.value = savedTime;
    timeEl.addEventListener('change', (e) => { sessionStorage.setItem('cart_timePick', e.target.value); showDateError(false); });
  }

  $("search").addEventListener("input", (e) => {
    buscaAtual = e.target.value.trim().toLowerCase();
    renderGrid(filterItems(itens));
  });

  $("category").addEventListener("change", (e) => {
    categoriaAtual = e.target.value;
    renderGrid(filterItems(itens));
  });

  const openBtn = $("openCart") || $("barViewCart");
  if(openBtn) openBtn.addEventListener("click", openCart);
  $("closeCart").addEventListener("click", closeCart);
  $("backdrop").addEventListener("click", closeCart);

  // Prevenir que cliques dentro do painel propaguem para o backdrop
  const drawerPanel = $("cartDrawer") && $("cartDrawer").querySelector('.drawer-panel');
  if(drawerPanel){
    // interceptar tanto mousedown quanto click para diferentes comportamentos de navegador
    drawerPanel.addEventListener('mousedown', (e) => e.stopPropagation());
    drawerPanel.addEventListener('click', (e) => e.stopPropagation());
  }

  $("clearCart").addEventListener("click", clearCart);

  function handleSendWhats(){
    // validações
    if(cartCount() === 0) return;
    const date = $("datePick").value;
    const time = $("timePick").value;
    if(!date || !time){
      // abrir drawer para preencher
      openCart();
      showDateError(true);
      return;
    }

    const msg = buildWhatsMessage();
    window.open(buildWhatsLink(msg), "_blank", "noopener");
  }
  $("sendWhats").addEventListener("click", handleSendWhats);
  const barWhats = $("barWhats");
  if(barWhats) barWhats.addEventListener("click", handleSendWhats);

  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape") closeCart();
  });
}

init();
