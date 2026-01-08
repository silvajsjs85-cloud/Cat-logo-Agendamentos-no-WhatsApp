// WhatsApp: wa.me exige DDI + DDD + número sem espaços/traços
const WHATS_NUMBER = "5569992405075";

const $ = (id) => document.getElementById(id);
const fmtBRL = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function formatDurationItem(mins){
  if (mins == null) return "";
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}

function formatDurationTotal(mins){
  if (!mins) return "0 min";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}

function buildWhatsLink(message){
  return `https://wa.me/${WHATS_NUMBER}?text=${encodeURIComponent(message)}`;
}

let itens = [];
let categoriaAtual = "Todas";
let buscaAtual = "";

let cart = {}; // { [id]: { item, qty } }

function cartCount(){
  return Object.values(cart).reduce((acc, x) => acc + x.qty, 0);
}

function cartTotal(){
  return Object.values(cart).reduce((acc, x) => acc + (x.qty * x.item.preco), 0);
}

function cartDurationMin(){
  return Object.values(cart).reduce((acc, x) => acc + (x.qty * (x.item.duracaoMin || 0)), 0);
}

function persistCart(){
  try{
    const map = {};
    Object.values(cart).forEach(({ item, qty }) => (map[item.id] = qty));
    localStorage.setItem("cart", JSON.stringify(map));
  }catch(_e){}
}

function loadCart(){
  try{
    const raw = localStorage.getItem("cart");
    if (!raw) return;
    const map = JSON.parse(raw);
    for (const k of Object.keys(map)){
      const id = Number(k);
      const qty = Number(map[k]);
      const item = itens.find((x) => x.id === id);
      if (item && qty > 0) cart[id] = { item, qty };
    }
  }catch(_e){}
}

function uniqueCategories(items){
  const set = new Set(items.map((p) => p.categoria));
  return ["Todas", ...Array.from(set).sort((a,b)=>a.localeCompare(b))];
}

function renderCategories(items){
  const select = $("category");
  select.innerHTML = "";
  uniqueCategories(items).forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
}

function filterItems(items){
  return items.filter((p) => {
    const matchCat = (categoriaAtual === "Todas") || (p.categoria === categoriaAtual);
    const matchSearch = !buscaAtual || p.nome.toLowerCase().includes(buscaAtual);
    return matchCat && matchSearch;
  });
}

function addToCart(id){
  const item = itens.find((x) => x.id === id);
  if (!item) return;

  if (!cart[id]) cart[id] = { item, qty: 0 };
  cart[id].qty += 1;

  updateCartUI();
}

function removeFromCart(id){
  if (!cart[id]) return;
  cart[id].qty -= 1;
  if (cart[id].qty <= 0) delete cart[id];
  updateCartUI();
}

function clearCart(){
  cart = {};
  updateCartUI();
}

function showDateError(show){
  const dateEl = $("datePick");
  const timeEl = $("timePick");
  const err = $("dateError");

  if (show){
    dateEl?.classList.add("error");
    timeEl?.classList.add("error");
    err?.classList.add("show");
  } else {
    dateEl?.classList.remove("error");
    timeEl?.classList.remove("error");
    err?.classList.remove("show");
  }
}

function buildWhatsMessage(){
  const name = $("clientName").value.trim();
  const notes = $("notes").value.trim();
  const date = $("datePick").value;
  const time = $("timePick").value;

  const lines = [];
  lines.push("Olá! Vim pelo site e gostaria de agendar:");
  lines.push("");

  Object.values(cart).forEach(({ item, qty }) => {
    lines.push(`• ${qty}x ${item.nome} — ${fmtBRL(item.preco)} (${formatDurationItem(item.duracaoMin)})`);
  });

  lines.push("");
  lines.push(`Total: ${fmtBRL(cartTotal())}`);
  lines.push(`Duração estimada: ${formatDurationTotal(cartDurationMin())}`);

  if (date && time){
    const [y,m,d] = date.split("-");
    lines.push("");
    lines.push(`Data: ${d}/${m}/${y}`);
    lines.push(`Horário: ${time}`);
  }

  if (name){
    lines.push("");
    lines.push(`Nome: ${name}`);
  }
  if (notes){
    lines.push("");
    lines.push(`Obs: ${notes}`);
  }

  return lines.join("\n");
}

function openCart(){
  $("cartDrawer").classList.remove("hidden");
  $("cartDrawer").setAttribute("aria-hidden", "false");
  $("bottomBar")?.classList.add("hidden"); // evita duplicar barra + drawer

  const dateEl = $("datePick");
  if (dateEl){
    dateEl.min = new Date().toISOString().split("T")[0];
  }
}

function closeCart(){
  $("cartDrawer").classList.add("hidden");
  $("cartDrawer").setAttribute("aria-hidden", "true");
  if (cartCount() > 0) $("bottomBar")?.classList.remove("hidden");
  updateBottomBarHeight();
}

function updateBottomBarHeight(){
  const bar = $("bottomBar");
  const h = (bar && !bar.classList.contains("hidden")) ? bar.offsetHeight : 0;
  document.documentElement.style.setProperty("--bottom-cart-h", `${h}px`);
}

function renderGrid(items){
  const grid = $("grid");
  grid.innerHTML = "";

  if (items.length === 0){
    grid.innerHTML = `<div class="muted">Nenhum item encontrado.</div>`;
    return;
  }

  items.forEach((p) => {
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
        <div class="price">${fmtBRL(p.preco)} • ${formatDurationItem(p.duracaoMin)}</div>

        <div class="actions">
          <button class="btn" type="button" data-add="${p.id}">Adicionar</button>
          <button class="cta" type="button" data-add="${p.id}">+ Carrinho</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => addToCart(Number(btn.dataset.add)));
  });
}

function updateCartUI(){
  const count = cartCount();

  // drawer
  $("cartSubtitle").textContent = `${count} item(s)`;
  $("cartTotal").textContent = fmtBRL(cartTotal());
  $("cartDuration").textContent = formatDurationTotal(cartDurationMin());

  // bottom bar
  $("barCount").textContent = String(count);
  $("barTotal").textContent = fmtBRL(cartTotal());
  $("barDuration").textContent = formatDurationTotal(cartDurationMin());

  // lista do carrinho
  const list = $("cartList");
  list.innerHTML = "";

  const entries = Object.values(cart);
  if (entries.length === 0){
    list.innerHTML = `<div class="muted">Seu carrinho está vazio.</div>`;
    $("sendWhats").disabled = true;
    $("barWhats").disabled = true;

    $("bottomBar")?.classList.add("hidden");
    persistCart();
    updateBottomBarHeight();
    return;
  }

  $("sendWhats").disabled = false;
  $("barWhats").disabled = false;

  entries.forEach(({ item, qty }) => {
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <div class="cart-item-top">
        <div>
          <div class="cart-item-name">${item.nome}</div>
          <div class="cart-item-meta">${item.categoria} • ${fmtBRL(item.preco)} • ${formatDurationItem(item.duracaoMin)}</div>
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

  list.querySelectorAll("[data-inc]").forEach((btn) => {
    btn.addEventListener("click", () => addToCart(Number(btn.dataset.inc)));
  });
  list.querySelectorAll("[data-dec]").forEach((btn) => {
    btn.addEventListener("click", () => removeFromCart(Number(btn.dataset.dec)));
  });

  // mostra a barra somente quando drawer estiver fechado
  if ($("cartDrawer").classList.contains("hidden")) {
    $("bottomBar")?.classList.remove("hidden");
  }

  persistCart();
  updateBottomBarHeight();
}

async function init(){
  $("year").textContent = String(new Date().getFullYear());

  const res = await fetch("itens.json");
  itens = await res.json();

  renderCategories(itens);
  renderGrid(itens);

  loadCart();
  updateCartUI();

  // controls
  $("search").addEventListener("input", (e) => {
    buscaAtual = e.target.value.trim().toLowerCase();
    renderGrid(filterItems(itens));
  });

  $("category").addEventListener("change", (e) => {
    categoriaAtual = e.target.value;
    renderGrid(filterItems(itens));
  });

  // drawer
  $("barViewCart").addEventListener("click", openCart);
  $("closeCart").addEventListener("click", closeCart);
  $("backdrop").addEventListener("click", closeCart);
  $("clearCart").addEventListener("click", clearCart);

  // valida data/hora e manda no Whats
  function handleSendWhats(){
    if (cartCount() === 0) return;

    const date = $("datePick").value;
    const time = $("timePick").value;

    if (!date || !time){
      openCart();
      showDateError(true);
      return;
    }

    const msg = buildWhatsMessage();
    window.open(buildWhatsLink(msg), "_blank", "noopener,noreferrer");
  }

  $("sendWhats").addEventListener("click", handleSendWhats);
  $("barWhats").addEventListener("click", handleSendWhats);

  $("datePick").addEventListener("change", () => showDateError(false));
  $("timePick").addEventListener("change", () => showDateError(false));

  // manter altura correta (especialmente quando o botão quebra linha)
  window.addEventListener("resize", updateBottomBarHeight);
  if (window.ResizeObserver){
    const ro = new ResizeObserver(updateBottomBarHeight);
    ro.observe($("bottomBar"));
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCart();
  });
}

init();
