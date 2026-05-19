/* Dark mode forcé — pas de toggle */

/* ===== BURGER MENU ===== */
function initBurger() {
  const burger = document.getElementById('burgerBtn');
  const menu = document.getElementById('mobileMenu');
  const close = document.getElementById('mobileClose');
  if (!burger || !menu) return;
  burger.addEventListener('click', function() {
    menu.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
  function closeMenu() {
    menu.classList.remove('open');
    document.body.style.overflow = '';
  }
  if (close) close.addEventListener('click', closeMenu);
  menu.querySelectorAll('a').forEach(function(a) { a.addEventListener('click', closeMenu); });
}

/* ===== NAV SHRINK ON SCROLL ===== */
function initNavShrink() {
  const nav = document.querySelector('.h-nav');
  if (!nav) return;
  window.addEventListener('scroll', function() {
    nav.classList.toggle('shrink', window.scrollY > 40);
  }, { passive: true });
}

/* ===== SCROLL REVEAL ===== */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        const delay = e.target.dataset.delay || 0;
        setTimeout(function() {
          e.target.classList.add('visible');
        }, delay);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  els.forEach(function(el) { obs.observe(el); });
}

/* ===== FAQ ACCORDION ===== */
function initFaq() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach(function(item) {
    const btn = item.querySelector('.faq-question');
    if (!btn) return;
    btn.addEventListener('click', function() {
      const isOpen = item.classList.contains('open');
      items.forEach(function(i) { i.classList.remove('open'); });
      if (!isOpen) item.classList.add('open');
    });
  });
}

/* ===== AVIS ANIMATION (Section 5) ===== */
function initAvisAnim() {
  const steps = document.querySelectorAll('.avis-step');
  if (!steps.length) return;
  let current = 0;
  function show(idx) {
    steps.forEach(function(s) { s.classList.remove('active'); });
    steps[idx].classList.add('active');
  }
  show(0);
  setInterval(function() {
    current = (current + 1) % steps.length;
    show(current);
  }, 2500);
}

/* ===== CHATBOT DEMO ANIMATION (Section 6) ===== */
function initChatAnim() {
  const msgs = document.querySelectorAll('.chat-msg');
  const dots = document.querySelector('.typing-dots');
  if (!msgs.length) return;

  const sequence = [
    { type: 'show-dots', delay: 0 },
    { type: 'show', idx: 0, delay: 900 },
    { type: 'hide-dots', delay: 900 },
    { type: 'show-dots', delay: 2000 },
    { type: 'show', idx: 1, delay: 2900 },
    { type: 'hide-dots', delay: 2900 },
    { type: 'show-dots', delay: 4200 },
    { type: 'show', idx: 2, delay: 5100 },
    { type: 'hide-dots', delay: 5100 },
    { type: 'show-dots', delay: 6400 },
    { type: 'show', idx: 3, delay: 7300 },
    { type: 'hide-dots', delay: 7300 },
    { type: 'show-dots', delay: 8600 },
    { type: 'show', idx: 4, delay: 9500 },
    { type: 'hide-dots', delay: 9500 },
    { type: 'show', idx: 5, delay: 10800 },
  ];

  function reset() {
    msgs.forEach(function(m) { m.classList.remove('visible'); });
    if (dots) dots.classList.remove('visible');
  }

  function runSequence() {
    reset();
    sequence.forEach(function(step) {
      if (step.type === 'show') {
        setTimeout(function() {
          if (msgs[step.idx]) msgs[step.idx].classList.add('visible');
        }, step.delay);
      } else if (step.type === 'show-dots') {
        setTimeout(function() {
          if (dots) dots.classList.add('visible');
        }, step.delay);
      } else if (step.type === 'hide-dots') {
        setTimeout(function() {
          if (dots) dots.classList.remove('visible');
        }, step.delay);
      }
    });
    setTimeout(runSequence, 13000);
  }

  const chatSection = document.querySelector('.ia-section');
  if (chatSection) {
    const obs = new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting) { runSequence(); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(chatSection);
  } else {
    runSequence();
  }
}

/* ===== BENTO — prevent navigation flash on touch ===== */
function initBento() {
  document.querySelectorAll('.bento-tile').forEach(function(tile) {
    tile.addEventListener('touchstart', function() {}, { passive: true });
  });
}

/* ===== CHAT MODAL (bento Agent IA) ===== */
function openChatModal() {
  var overlay = document.getElementById('chatOverlay');
  var win = document.getElementById('lyaeco-win');
  var btn = document.getElementById('lyaeco-btn');
  if (overlay) overlay.classList.add('open');
  if (win) win.classList.add('lyaeco-centered');
  if (btn && win && !win.classList.contains('lyaeco-open')) btn.click();
  document.body.style.overflow = 'hidden';
}
function closeChatModal() {
  var overlay = document.getElementById('chatOverlay');
  var win = document.getElementById('lyaeco-win');
  var closeBtn = document.getElementById('lyaeco-close');
  if (overlay) overlay.classList.remove('open');
  if (win) win.classList.remove('lyaeco-centered');
  if (closeBtn) closeBtn.click();
  document.body.style.overflow = '';
}

/* ===== POPUP AUDIT ===== */
function openAuditPopup() {
  var p = document.getElementById('auditPopup');
  if (p) p.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeAuditPopup() {
  var p = document.getElementById('auditPopup');
  if (p) p.classList.remove('open');
  document.body.style.overflow = '';
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', function() {
  initBurger();
  initNavShrink();
  initScrollReveal();
  initFaq();
  initAvisAnim();
  initChatAnim();
  initBento();
});
