/* Decatur Espresso demo site: index page interactions */
(function () {
  'use strict';

  if (new URLSearchParams(location.search).has('flat')) {
    document.documentElement.classList.add('flat');
  }

  var toggle = document.getElementById('nav-toggle');
  var links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        links.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Hero consultation form: demo stub, nothing is transmitted
  var consultForm = document.getElementById('consult-form');
  var consultDone = document.getElementById('consult-done');
  if (consultForm && consultDone) {
    consultForm.addEventListener('submit', function (e) {
      e.preventDefault();
      consultForm.hidden = true;
      consultDone.hidden = false;
    });
    document.getElementById('consult-reset').addEventListener('click', function () {
      consultForm.reset();
      consultDone.hidden = true;
      consultForm.hidden = false;
      document.getElementById('cf-name').focus();
    });
  }

  // Drink profit calculator. Frappe and smoothie serving costs are Decatur's
  // published numbers; chai is derived from case price with stated assumptions.
  var CALC = {
    frappe:   { cost: 1.44, defaultPrice: 5.00 },
    smoothie: { cost: 2.08, defaultPrice: 6.00 },
    chai:     { cost: 1.90, defaultPrice: 5.50 }
  };
  var calcDrink = document.getElementById('calc-drink');
  if (calcDrink) {
    var calcVolume = document.getElementById('calc-volume');
    var calcVolumeOut = document.getElementById('calc-volume-out');
    var calcPrice = document.getElementById('calc-price');
    var money = function (v) {
      var s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return (v < 0 ? '-$' : '$') + s;
    };
    var moneyRound = function (v) {
      return (v < 0 ? '-$' : '$') + Math.abs(Math.round(v)).toLocaleString('en-US');
    };
    var renderCalc = function () {
      var d = CALC[calcDrink.value];
      var vol = parseInt(calcVolume.value, 10);
      var price = Math.max(0, parseFloat(calcPrice.value) || 0);
      var margin = price - d.cost;
      var day = margin * vol;
      calcVolumeOut.textContent = vol;
      document.getElementById('calc-cost').textContent = money(d.cost);
      document.getElementById('calc-margin').textContent = money(margin);
      document.getElementById('calc-month').textContent = moneyRound(day * 30);
      document.getElementById('calc-day').textContent = moneyRound(day);
      document.getElementById('calc-year').textContent = moneyRound(day * 365);
    };
    calcDrink.addEventListener('change', function () {
      calcPrice.value = CALC[calcDrink.value].defaultPrice.toFixed(2);
      renderCalc();
    });
    calcVolume.addEventListener('input', renderCalc);
    calcPrice.addEventListener('input', renderCalc);
    renderCalc();
  }

  // Gentle reveal on scroll; skipped for reduced motion and ?flat
  var motionOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    !document.documentElement.classList.contains('flat');
  if (motionOK && 'IntersectionObserver' in window) {
    var targets = document.querySelectorAll('.pillar, .sample-sheet, .route-table, .consult-photo, .pc-photo, .calc-card');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.15 });
    targets.forEach(function (t) {
      t.classList.add('reveal');
      io.observe(t);
    });

    // Stats count up once, quickly and quietly
    var stats = document.querySelectorAll('.stat-n[data-count]');
    if (stats.length) {
      var sio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          sio.unobserve(en.target);
          var el = en.target;
          var target = parseInt(el.getAttribute('data-count'), 10);
          var suffix = el.textContent.indexOf('+') !== -1 ? '+' : '';
          var t0 = null;
          var step = function (ts) {
            if (!t0) t0 = ts;
            var p = Math.min(1, (ts - t0) / 700);
            el.textContent = Math.round(target * (0.4 + 0.6 * p)) + suffix;
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
      }, { threshold: 0.6 });
      stats.forEach(function (s) { sio.observe(s); });
    }
  }
})();
