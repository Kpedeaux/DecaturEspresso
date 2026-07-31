/* Decatur Espresso demo store.
   All state is local; nothing is transmitted anywhere. */
(function () {
  'use strict';

  var CAT = window.DECATUR_CATALOG;
  if (!CAT) return;

  var STORAGE_KEY = 'decatur-demo-cart-v1';
  var LAST_ORDER_KEY = 'decatur-demo-last-order';
  var FREE_DELIVERY_CENTS = 10000;

  var ROUTES = {
    westbank: 'Westbank orders deliver every Monday.',
    northshore: 'Northshore orders deliver every Monday.',
    neworleans: 'New Orleans orders deliver every Wednesday.',
    mississippi: 'Mississippi orders deliver every Thursday.',
    batonrouge: 'Baton Rouge orders deliver every other Tuesday.',
    lafayette: 'Lafayette orders deliver every other Tuesday.',
    houma: 'Houma orders deliver every other Friday.'
  };
  var ROUTE_LABELS = {
    westbank: 'Westbank', northshore: 'Northshore', neworleans: 'New Orleans',
    mississippi: 'Mississippi', batonrouge: 'Baton Rouge', lafayette: 'Lafayette', houma: 'Houma'
  };
  var ROUTE_DAYS = {
    westbank: 'every Monday', northshore: 'every Monday', neworleans: 'every Wednesday',
    mississippi: 'every Thursday', batonrouge: 'every other Tuesday',
    lafayette: 'every other Tuesday', houma: 'every other Friday'
  };

  function loadLastOrder() {
    try {
      var raw = localStorage.getItem(LAST_ORDER_KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      if (!d || typeof d.cart !== 'object') return null;
      return d;
    } catch (e) { return null; }
  }

  var fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  var money = function (cents) { return fmt.format(cents / 100); };

  var state = {
    query: '',
    group: 'all',
    cart: {},
    focusReturn: null
  };

  var productIndex = {};
  CAT.products.forEach(function (p) { productIndex[p.id] = p; });

  // ---- persistence ----
  function loadCart() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      var data = JSON.parse(raw);
      var clean = {};
      Object.keys(data).forEach(function (id) {
        var q = parseInt(data[id], 10);
        if (productIndex[id] && q > 0) clean[id] = Math.min(q, 999);
      });
      return clean;
    } catch (e) { return {}; }
  }
  function saveCart() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cart)); } catch (e) {}
  }

  // ---- derived ----
  function cartCount() {
    return Object.keys(state.cart).reduce(function (n, id) { return n + state.cart[id]; }, 0);
  }
  function cartSubtotalCents() {
    return Object.keys(state.cart).reduce(function (n, id) {
      return n + state.cart[id] * productIndex[id].priceCents;
    }, 0);
  }
  function matches(p, q) {
    if (!q) return true;
    var hay = (p.name + ' ' + (p.brand || '') + ' ' + p.category + ' ' + p.pack).toLowerCase();
    return q.split(/\s+/).every(function (t) { return hay.indexOf(t) !== -1; });
  }
  function visibleProducts() {
    var q = state.query.trim().toLowerCase();
    return CAT.products.filter(function (p) {
      return (state.group === 'all' || p.group === state.group) && matches(p, q);
    });
  }

  // ---- els ----
  var el = {
    groups: document.getElementById('groups'),
    catalog: document.getElementById('catalog'),
    search: document.getElementById('search'),
    cartOpen: document.getElementById('cart-open'),
    cartCount: document.getElementById('cart-count'),
    drawer: document.getElementById('cart-drawer'),
    backdrop: document.getElementById('drawer-backdrop'),
    cartClose: document.getElementById('cart-close'),
    cartLines: document.getElementById('cart-lines'),
    cartMeter: document.getElementById('cart-meter'),
    cartSubtotal: document.getElementById('cart-subtotal'),
    cartReview: document.getElementById('cart-review'),
    cartClear: document.getElementById('cart-clear'),
    checkout: document.getElementById('checkout'),
    checkoutBody: document.getElementById('checkout-body'),
    routeStrip: document.getElementById('route-strip'),
    routeStripText: document.getElementById('route-strip-text'),
    loadLast: document.getElementById('load-last')
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---- group nav ----
  function renderGroups() {
    var counts = { all: CAT.products.length };
    CAT.products.forEach(function (p) { counts[p.group] = (counts[p.group] || 0) + 1; });
    var html = '<button class="group-btn" data-group="all">All products <span class="n">' + counts.all + '</span></button>';
    CAT.groups.forEach(function (g) {
      html += '<button class="group-btn" data-group="' + g.id + '">' + esc(g.label) +
        ' <span class="n">' + (counts[g.id] || 0) + '</span></button>';
    });
    el.groups.innerHTML = html;
    syncGroupButtons();
  }
  function syncGroupButtons() {
    Array.prototype.forEach.call(el.groups.querySelectorAll('.group-btn'), function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-group') === state.group);
    });
  }

  // ---- catalog ----
  function rowlineText(p, qty) {
    return qty + ' × ' + money(p.priceCents) + ' = ' + money(qty * p.priceCents);
  }
  function stepperHTML(p, qty) {
    var n = esc(p.name);
    return '<div class="pqty" data-id="' + p.id + '">' +
      '<button type="button" class="qminus" aria-label="Decrease quantity of ' + n + '">−</button>' +
      '<input class="qin" type="number" min="0" max="999" inputmode="numeric" value="' + qty + '" aria-label="Quantity of ' + n + '">' +
      '<button type="button" class="qplus" aria-label="Increase quantity of ' + n + '">+</button>' +
      '</div>';
  }
  function renderCatalog() {
    var list = visibleProducts();
    if (!list.length) {
      el.catalog.innerHTML =
        '<h1 class="shop-title">Wholesale catalog</h1>' +
        '<p class="shop-sub">' + CAT.products.length + ' products. Prices from the ' + esc(CAT.source) + '.</p>' +
        '<div class="empty-state">Nothing matches "' + esc(state.query.trim()) + '". ' +
        '<button type="button" id="clear-search">Clear search</button></div>';
      return;
    }
    var html = '<h1 class="shop-title">Wholesale catalog</h1>' +
      '<p class="shop-sub">' + CAT.products.length + ' products. Prices from the ' + esc(CAT.source) +
      '. Set quantities as you go, like the paper order sheet.</p>';
    var lastCat = null;
    var catCounts = {};
    list.forEach(function (p) { catCounts[p.category] = (catCounts[p.category] || 0) + 1; });
    list.forEach(function (p) {
      if (p.category !== lastCat) {
        lastCat = p.category;
        html += '<h2 class="cat-head">' + esc(p.category) +
          ' <span class="n">' + catCounts[p.category] + ' item' + (catCounts[p.category] === 1 ? '' : 's') + '</span></h2>';
      }
      var qty = state.cart[p.id] || 0;
      var infoNote = p.note && p.note.charAt(0) === '$';  // price-per-lb info reads as meta, not a badge
      html += '<div class="prow' + (qty > 0 ? ' in-cart' : '') + '" data-row="' + p.id + '">' +
        '<div class="prow-main"><span class="pname">' + esc(p.name) + '</span>' +
        (p.note && !infoNote ? '<span class="pchip">' + esc(p.note) + '</span>' : '') +
        '<span class="pmeta">' + (p.brand ? '<span class="pbrand">' + esc(p.brand) + '</span> · ' : '') +
        esc(p.pack) + (infoNote ? ' · ' + esc(p.note) : '') + '</span>' +
        '<span class="rowline"' + (qty > 0 ? '' : ' hidden') + '>' + rowlineText(p, qty) + '</span></div>' +
        '<div class="pprice">' + money(p.priceCents) + '</div>' +
        stepperHTML(p, qty) +
        '</div>';
    });
    el.catalog.innerHTML = html;
  }

  // ---- cart ui ----
  function renderCartUI() {
    renderCartLines();
    renderCartTotals();
  }
  function renderCartLines() {
    var ids = Object.keys(state.cart);
    if (!ids.length) {
      var lastBtn = loadLastOrder() ?
        '<div class="cart-empty-last"><button type="button" class="load-last-inline">Load your last order</button></div>' : '';
      el.cartLines.innerHTML = '<div class="cart-empty">The order sheet is empty. Set a quantity on any product to start.' + lastBtn + '</div>';
    } else {
      var html = '';
      ids.map(function (id) { return productIndex[id]; })
        .sort(function (a, b) { return a.category === b.category ? a.name.localeCompare(b.name) : a.category.localeCompare(b.category); })
        .forEach(function (p) {
          var qty = state.cart[p.id];
          html += '<div class="cart-line">' +
            '<div><div class="cart-line-name">' + esc(p.name) + '</div>' +
            '<div class="cart-line-meta">' + esc(p.pack) + ' · ' + money(p.priceCents) + ' each</div>' +
            stepperHTML(p, qty) + '</div>' +
            '<div class="cart-line-total">' + money(qty * p.priceCents) + '</div>' +
            '</div>';
        });
      el.cartLines.innerHTML = html;
    }
  }
  var lastBadgeCount = -1;
  function renderCartTotals() {
    var count = cartCount();
    el.cartCount.textContent = count;
    if (lastBadgeCount !== -1 && count !== lastBadgeCount) {
      el.cartCount.classList.remove('bump');
      void el.cartCount.offsetWidth; // restart the animation
      el.cartCount.classList.add('bump');
    }
    lastBadgeCount = count;
    renderRouteStrip();
    var ids = Object.keys(state.cart);
    var sub = cartSubtotalCents();
    el.cartSubtotal.textContent = money(sub);
    if (sub >= FREE_DELIVERY_CENTS) {
      el.cartMeter.className = 'cart-meter unlocked';
      el.cartMeter.innerHTML = 'Free delivery unlocked.<div class="bar"><div class="fill" style="width:100%"></div></div>';
    } else {
      el.cartMeter.className = 'cart-meter';
      el.cartMeter.innerHTML = 'Add ' + money(FREE_DELIVERY_CENTS - sub) + ' for free delivery.' +
        '<div class="bar"><div class="fill" style="width:' + Math.round(sub / FREE_DELIVERY_CENTS * 100) + '%"></div></div>';
    }
    el.cartReview.disabled = !ids.length;
  }

  function setQty(id, qty, opts) {
    opts = opts || {};
    qty = Math.max(0, Math.min(999, qty | 0));
    if (qty === 0) delete state.cart[id];
    else state.cart[id] = qty;
    saveCart();
    renderCartTotals();
    if (opts.rebuildLines === false) {
      // typing inside the drawer: update that line's total in place, no rebuild
      var wrap = el.cartLines.querySelector('.pqty[data-id="' + id + '"]');
      var line = wrap && wrap.closest('.cart-line');
      if (line) {
        var t = line.querySelector('.cart-line-total');
        if (t) t.textContent = money(qty * productIndex[id].priceCents);
      }
    } else {
      renderCartLines();
    }
    // update catalog row without a full rebuild
    var row = el.catalog.querySelector('[data-row="' + id + '"]');
    if (row) {
      row.classList.toggle('in-cart', qty > 0);
      var input = row.querySelector('.qin');
      if (input && !opts.skipInput) input.value = qty;
      var rl = row.querySelector('.rowline');
      if (rl) {
        rl.hidden = qty === 0;
        if (qty > 0) rl.textContent = rowlineText(productIndex[id], qty);
      }
    }
  }

  // ---- returning-customer strip ----
  function renderRouteStrip() {
    var last = loadLastOrder();
    if (!last) { el.routeStrip.hidden = true; return; }
    el.routeStrip.hidden = false;
    if (last.area && ROUTE_LABELS[last.area]) {
      el.routeStripText.textContent = 'Your route: ' + ROUTE_LABELS[last.area] + ' · delivers ' + ROUTE_DAYS[last.area] + '.';
    } else {
      el.routeStripText.textContent = 'Welcome back.';
    }
    el.loadLast.hidden = cartCount() > 0;
  }
  function restoreLastOrder() {
    var last = loadLastOrder();
    if (!last) return;
    var clean = {};
    Object.keys(last.cart).forEach(function (id) {
      var q = parseInt(last.cart[id], 10);
      if (productIndex[id] && q > 0) clean[id] = Math.min(q, 999);
    });
    state.cart = clean;
    saveCart();
    renderCartUI();
    renderCatalog();
  }

  // ---- drawer ----
  function openDrawer() {
    state.focusReturn = document.activeElement;
    el.drawer.hidden = false;
    el.backdrop.hidden = false;
    el.cartClose.focus();
  }
  function closeDrawer() {
    el.drawer.hidden = true;
    el.backdrop.hidden = true;
    if (state.focusReturn) { state.focusReturn.focus(); state.focusReturn = null; }
  }

  // ---- checkout ----
  function summaryTableHTML() {
    var byCat = {};
    Object.keys(state.cart).forEach(function (id) {
      var p = productIndex[id];
      (byCat[p.category] = byCat[p.category] || []).push(p);
    });
    var html = '<table class="co-table"><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Each</th><th class="r">Total</th></tr></thead><tbody>';
    Object.keys(byCat).sort().forEach(function (cat) {
      html += '<tr class="cat-row"><td colspan="4">' + esc(cat) + '</td></tr>';
      byCat[cat].sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (p) {
        var q = state.cart[p.id];
        html += '<tr><td>' + esc(p.name) + ' <span class="cart-line-meta">' + esc(p.pack) + '</span></td>' +
          '<td class="r">' + q + '</td><td class="r">' + money(p.priceCents) + '</td>' +
          '<td class="r">' + money(q * p.priceCents) + '</td></tr>';
      });
    });
    html += '</tbody><tfoot><tr><td colspan="3">Order total</td><td class="r">' + money(cartSubtotalCents()) + '</td></tr></tfoot></table>';
    return html;
  }

  function openCheckout() {
    closeDrawer();
    state.focusReturn = document.activeElement;
    var last = loadLastOrder();
    var defArea = last && last.area && ROUTE_LABELS[last.area] ? last.area : '';
    el.checkoutBody.innerHTML =
      '<button type="button" class="icon-btn checkout-close" id="checkout-close">Close</button>' +
      '<h2>Review demo order</h2>' +
      '<div class="demo-note"><strong>Demo checkout.</strong> This is a demonstration. Nothing is sent and no payment is taken. ' +
      'Prefer the phone? <a href="tel:+15047339881">504-733-9881</a>.</div>' +
      '<form id="co-form">' +
      '<div class="co-fields">' +
      '<div><label for="co-biz">Business name</label><input id="co-biz" required autocomplete="organization" placeholder=" "></div>' +
      '<div><label for="co-name">Contact name</label><input id="co-name" required autocomplete="name" placeholder=" "></div>' +
      '<div><label for="co-contact">Phone or email</label><input id="co-contact" required placeholder=" "></div>' +
      '<div><label for="co-area">Delivery area</label><select id="co-area" required>' +
      '<option value=""' + (defArea ? '' : ' selected') + ' disabled>Choose your area</option>' +
      Object.keys(ROUTE_LABELS).map(function (k) {
        return '<option value="' + k + '"' + (k === defArea ? ' selected' : '') + '>' + ROUTE_LABELS[k] + '</option>';
      }).join('') +
      '</select></div>' +
      '<div class="route-note" id="route-note" aria-live="polite">' + (defArea ? ROUTES[defArea] : '') + '</div>' +
      '</div>' +
      '<div class="co-summary"><h3>Order summary</h3>' + summaryTableHTML() + '</div>' +
      '<button type="submit" class="btn btn-gold">Place demo order</button>' +
      '</form>';
    el.checkout.hidden = false;
    document.getElementById('checkout-close').focus();
  }

  function closeCheckout() {
    el.checkout.hidden = true;
    if (state.focusReturn) { state.focusReturn.focus(); state.focusReturn = null; }
  }

  function confirmOrder() {
    var area = document.getElementById('co-area').value;
    var biz = document.getElementById('co-biz').value;
    var now = new Date();
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var ref = 'DEMO-' + pad(now.getMonth() + 1) + pad(now.getDate()) + '-' + pad(now.getHours()) + pad(now.getMinutes());
    try {
      localStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ cart: state.cart, area: area, ts: now.getTime() }));
    } catch (e) {}
    el.checkoutBody.innerHTML =
      '<button type="button" class="icon-btn checkout-close" id="checkout-close">Close</button>' +
      '<div class="stamp" aria-hidden="true">Demo order received</div>' +
      '<h2>Demo order received</h2>' +
      '<p class="confirm-ref">' + ref + '</p>' +
      '<p>' + esc(biz) + ' · ' + (ROUTES[area] || '') + '</p>' +
      '<div class="co-summary">' + summaryTableHTML() + '</div>' +
      '<div class="demo-note"><strong>Demo only.</strong> In the real store this order would go to Decatur for weekly delivery. This demo sent nothing.</div>' +
      '<div class="confirm-actions">' +
      '<button type="button" class="btn btn-gold" id="co-print">Print order sheet</button>' +
      '<button type="button" class="btn btn-ghost" id="co-back">Back to the catalog</button>' +
      '</div>';
    renderRouteStrip();
    document.getElementById('checkout-close').focus();
  }

  // ---- events ----
  el.groups.addEventListener('click', function (e) {
    var b = e.target.closest('.group-btn');
    if (!b) return;
    state.group = b.getAttribute('data-group');
    syncGroupButtons();
    renderCatalog();
    if (history.replaceState) {
      var url = state.group === 'all' ? location.pathname : '?group=' + state.group;
      history.replaceState(null, '', url);
    }
  });

  var searchTimer = null;
  el.search.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      state.query = el.search.value;
      renderCatalog();
    }, 120);
  });

  function bindStepperEvents(container, opts) {
    container.addEventListener('click', function (e) {
      var wrap = e.target.closest('.pqty');
      if (!wrap) {
        var clear = e.target.closest('#clear-search');
        if (clear) { el.search.value = ''; state.query = ''; renderCatalog(); el.search.focus(); }
        return;
      }
      var id = wrap.getAttribute('data-id');
      var cur = state.cart[id] || 0;
      if (e.target.closest('.qplus')) setQty(id, cur + 1, opts);
      else if (e.target.closest('.qminus')) setQty(id, cur - 1, opts);
    });
    container.addEventListener('input', function (e) {
      var input = e.target.closest('.qin');
      if (!input) return;
      var wrap = input.closest('.pqty');
      var v = parseInt(input.value, 10);
      if (isNaN(v)) return;
      var inDrawer = container === el.cartLines;
      setQty(wrap.getAttribute('data-id'), v, { skipInput: !inDrawer, rebuildLines: !inDrawer });
    });
    container.addEventListener('change', function (e) {
      var input = e.target.closest('.qin');
      if (!input) return;
      var wrap = input.closest('.pqty');
      var v = parseInt(input.value, 10);
      if (isNaN(v) || v < 0) v = 0;
      setQty(wrap.getAttribute('data-id'), v);
    });
  }
  bindStepperEvents(el.catalog);
  bindStepperEvents(el.cartLines);

  el.cartOpen.addEventListener('click', openDrawer);
  el.cartClose.addEventListener('click', closeDrawer);
  el.backdrop.addEventListener('click', closeDrawer);
  el.cartClear.addEventListener('click', function () {
    state.cart = {};
    saveCart();
    renderCartUI();
    renderCatalog();
  });
  el.cartReview.addEventListener('click', openCheckout);
  el.loadLast.addEventListener('click', restoreLastOrder);
  el.cartLines.addEventListener('click', function (e) {
    if (e.target.closest('.load-last-inline')) restoreLastOrder();
  });

  el.checkout.addEventListener('click', function (e) {
    if (e.target === el.checkout) closeCheckout();
    if (e.target.closest('#checkout-close')) closeCheckout();
    if (e.target.closest('#co-back')) { closeCheckout(); }
    if (e.target.closest('#co-print')) window.print();
  });
  el.checkout.addEventListener('submit', function (e) {
    e.preventDefault();
    confirmOrder();
  });
  el.checkout.addEventListener('change', function (e) {
    if (e.target.id === 'co-area') {
      document.getElementById('route-note').textContent = ROUTES[e.target.value] || '';
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!el.checkout.hidden) closeCheckout();
      else if (!el.drawer.hidden) closeDrawer();
      return;
    }
    // Keep Tab inside whichever dialog is open (aria-modal promises it)
    if (e.key === 'Tab') {
      var dialog = !el.checkout.hidden ? el.checkout : (!el.drawer.hidden ? el.drawer : null);
      if (!dialog) return;
      var items = dialog.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
      );
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!dialog.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // ---- init ----
  var params = new URLSearchParams(location.search);
  var g = params.get('group');
  if (g && (g === 'all' || CAT.groups.some(function (x) { return x.id === g; }))) state.group = g;
  if (params.has('flat')) document.documentElement.classList.add('flat');

  state.cart = loadCart();
  renderGroups();
  renderCatalog();
  renderCartUI();
})();
