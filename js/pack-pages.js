/* ===== HELPERS ===== */
function fmtPrice(n) {
  return n.toLocaleString('fr-FR') + '€';
}

/* ===== OPTIONS CALCULATOR ===== */
function initCalculator() {
  const options = document.querySelectorAll('.pp-option');
  if (!options.length) return;

  const basePrice = parseInt(document.body.dataset.basePrice || 0, 10);

  function getTotal() {
    let total = basePrice;
    options.forEach(function(opt) {
      if (!opt.classList.contains('checked')) return;
      const price = parseInt(opt.dataset.price || 0, 10);
      const qtyInput = opt.querySelector('input[type="number"]');
      const qty = qtyInput ? Math.max(1, parseInt(qtyInput.value || 1, 10)) : 1;
      total += price * qty;
    });
    return total;
  }

  function updateTotal() {
    const el = document.getElementById('pp-total-amount');
    if (el) el.textContent = fmtPrice(getTotal());
    updateRecap();
  }

  options.forEach(function(opt) {
    opt.addEventListener('click', function(e) {
      if (e.target.tagName === 'INPUT' && e.target.type === 'number') return;
      opt.classList.toggle('checked');
      const check = opt.querySelector('.pp-option-check');
      if (check) check.textContent = opt.classList.contains('checked') ? '✓' : '';
      updateTotal();
    });
    const qtyInput = opt.querySelector('input[type="number"]');
    if (qtyInput) {
      qtyInput.addEventListener('input', updateTotal);
      qtyInput.addEventListener('change', updateTotal);
    }
  });

  updateTotal();
}

/* ===== RECAP (used by Modal A) ===== */
function updateRecap() {
  const recapOpts = document.getElementById('recap-opts');
  const recapTotal = document.getElementById('recap-total');
  if (!recapOpts || !recapTotal) return;

  const basePrice = parseInt(document.body.dataset.basePrice || 0, 10);
  const packPriceEl = document.getElementById('recap-pack-price');
  if (packPriceEl) packPriceEl.textContent = fmtPrice(basePrice);

  let total = basePrice;
  let html = '';
  document.querySelectorAll('.pp-option.checked').forEach(function(opt) {
    const name = (opt.querySelector('.pp-option-name') || {}).textContent || '';
    const price = parseInt(opt.dataset.price || 0, 10);
    const qtyInput = opt.querySelector('input[type="number"]');
    const qty = qtyInput ? Math.max(1, parseInt(qtyInput.value || 1, 10)) : 1;
    const line = price * qty;
    total += line;
    html += '<div class="pp-recap-opt"><span>+ ' + name + (qty > 1 ? ' ×' + qty : '') + '</span><span>+' + fmtPrice(line) + '</span></div>';
  });

  recapOpts.innerHTML = html;
  recapTotal.textContent = fmtPrice(total);
}

/* ===== MODALS ===== */
function openModal(id) {
  if (id === 'modalA') updateRecap();
  var m = document.getElementById(id);
  if (m) { m.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  var m = document.getElementById(id);
  if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
}

/* shortcuts kept for inline onclick usage */
function openModalA() { openModal('modalA'); }
function closeModalA() { closeModal('modalA'); }
function openModalB() { openModal('modalB'); }
function closeModalB() { closeModal('modalB'); }

/* ===== FORM SUBMIT ===== */
function initForms() {
  var packName = document.body.dataset.packName || 'Pack';

  /* Modal A — devis chiffré */
  var formA = document.getElementById('formA');
  if (formA) {
    formA.addEventListener('submit', function(e) {
      e.preventDefault();
      var btn = formA.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Envoi…'; }

      var basePrice = parseInt(document.body.dataset.basePrice || 0, 10);
      var total = basePrice;
      var optsList = [];
      document.querySelectorAll('.pp-option.checked').forEach(function(opt) {
        var name = (opt.querySelector('.pp-option-name') || {}).textContent || '';
        var price = parseInt(opt.dataset.price || 0, 10);
        var qtyInput = opt.querySelector('input[type="number"]');
        var qty = qtyInput ? Math.max(1, parseInt(qtyInput.value || 1, 10)) : 1;
        var line = price * qty;
        total += line;
        optsList.push(name + (qty > 1 ? ' ×' + qty : '') + ' (+' + line + '€)');
      });

      var data = new FormData(formA);
      data.append('subject', 'Devis ' + packName);
      data.append('pack', packName);
      data.append('total', fmtPrice(total));
      data.append('options', optsList.join(', ') || 'Aucune');

      fetch('send-mail.php', { method: 'POST', body: data })
        .then(function() {
          var ok = document.getElementById('formA-ok');
          if (ok) { formA.style.display = 'none'; ok.style.display = 'block'; }
        })
        .catch(function() {
          if (btn) { btn.disabled = false; btn.textContent = 'Envoyer mon devis'; }
          alert('Erreur d\'envoi. Réessayez ou appelez-nous directement.');
        });
    });
  }

  /* Modal B — rappel */
  var formB = document.getElementById('formB');
  if (formB) {
    formB.addEventListener('submit', function(e) {
      e.preventDefault();
      var btn = formB.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Envoi…'; }

      var data = new FormData(formB);
      data.append('subject', 'Demande de rappel pour ' + packName);
      data.append('pack', packName);

      fetch('send-mail.php', { method: 'POST', body: data })
        .then(function() {
          var ok = document.getElementById('formB-ok');
          if (ok) { formB.style.display = 'none'; ok.style.display = 'block'; }
        })
        .catch(function() {
          if (btn) { btn.disabled = false; btn.textContent = 'Être rappelé'; }
          alert('Erreur d\'envoi. Réessayez ou appelez-nous directement.');
        });
    });
  }
}

/* ===== NAV SHRINK ===== */
function initNavShrink() {
  var nav = document.querySelector('.pp-nav');
  if (!nav) return;
  window.addEventListener('scroll', function() {
    nav.style.boxShadow = window.scrollY > 40
      ? '0 4px 30px rgba(0,0,0,.4)'
      : '0 4px 20px rgba(0,0,0,.2)';
  }, { passive: true });
}

/* ===== CLOSE MODAL ON OVERLAY CLICK ===== */
function initModalClose() {
  ['modalA', 'modalB'].forEach(function(id) {
    var overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeModal(id);
    });
  });
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', function() {
  initCalculator();
  initForms();
  initNavShrink();
  initModalClose();
});

/* ===== PACK FEATURES COLLAPSE (mobile only) ===== */
document.addEventListener('DOMContentLoaded', function() {
  if (window.innerWidth > 768) return;
  document.querySelectorAll('.pp-features').forEach(function(container) {
    if (container.querySelectorAll('.pp-feature').length <= 4) return;
    container.classList.add('pack-collapsed');
    var btn = document.createElement('button');
    btn.className = 'pack-toggle-btn';
    btn.textContent = 'Voir tout le détail ↓';
    btn.addEventListener('click', function() {
      var isCollapsed = container.classList.toggle('pack-collapsed');
      btn.textContent = isCollapsed ? 'Voir tout le détail ↓' : 'Masquer ↑';
    });
    container.parentNode.insertBefore(btn, container.nextSibling);
  });
});
