(function () {
  'use strict';

  /* ─── TARIFS (source : data/tarifs.json) ─────────────── */
  var PACKS = { M1: 380, M2: 600, M3: 1500 };
  var PACK_LABELS = { M1: 'Pack Vitrine', M2: 'Pack Réservation', M3: 'Pack Boutique' };
  var PACK_DESC   = {
    M1: 'Présentation de votre activité · Formulaire de contact · Avis clients automatiques',
    M2: 'Site vitrine · Module réservation en ligne · Avis clients automatiques',
    M3: 'Boutique e-commerce complète · Paiement sécurisé · Avis clients automatiques'
  };

  var FALLBACK_OPTIONS = {
    M1: [
      {label:'Chat en direct (WhatsApp/widget)',prix:40},
      {label:'Google Maps intégré',prix:15},
      {label:'Logo personnalisé (créé de zéro)',prix:40},
      {label:'Refonte fiche Google Business Profile',prix:15},
      {label:'Hébergement 1 an',prix:10,unite:'an'},
      {label:'Email professionnel',prix:10,unite:'an'},
      {label:'Page supplémentaire',prix:10,unite:'page'},
      {label:'Langue ou devise supplémentaire',prix:5,unite:'unité'}
    ],
    M2: [
      {label:'Chat en direct (WhatsApp/widget)',prix:40},
      {label:'Prise RDV Google Calendar',prix:10},
      {label:'Google Maps intégré',prix:15},
      {label:'Logo personnalisé (créé de zéro)',prix:40},
      {label:'Refonte fiche Google Business Profile',prix:15},
      {label:'Page supplémentaire',prix:10,unite:'page'},
      {label:'Langue ou devise supplémentaire',prix:5,unite:'unité'}
    ],
    M3: [
      {label:'Chat en direct (WhatsApp/widget)',prix:40},
      {label:'Google Maps intégré',prix:15},
      {label:'Logo personnalisé (créé de zéro)',prix:40},
      {label:'Refonte fiche Google Business Profile',prix:15},
      {label:'Page supplémentaire',prix:10,unite:'page'},
      {label:'Langue ou devise supplémentaire',prix:5,unite:'unité'}
    ]
  };
  function getFallbackCheckboxes(pack) {
    var p = (pack && FALLBACK_OPTIONS[pack]) ? pack : 'M1';
    return { pack: p, question: 'Quelles options souhaitez-vous ajouter ?', options: FALLBACK_OPTIONS[p] };
  }

  /* ─── VALIDATION ─────────────────────────────────────── */
  var TEMP_DOMAINS = ['yopmail','mailinator','10minutemail','guerrillamail','tempmail','throwaway','sharklasers','grr.la','discard.email','trashmail'];
  var BAD_NAMES    = ['azerty','qwerty','asdfg','zxcvb','test','abcde','aaaaa','nnnnn','prénom','prenom','nomsurnom'];

  function validateName(v) {
    if (!v || v.trim().length < 2) return 'Minimum 2 caractères.';
    if (!/^[a-zA-ZÀ-ÿ\s'\-]+$/.test(v)) return 'Lettres, espaces, tirets ou apostrophes uniquement.';
    var lo = v.toLowerCase().replace(/\s/g,'');
    for (var i = 0; i < BAD_NAMES.length; i++) { if (lo.indexOf(BAD_NAMES[i]) >= 0) return 'Ce nom ne semble pas valide.'; }
    if (/(.)\1{3,}/.test(lo)) return 'Ce nom ne semble pas valide.';
    return null;
  }
  function validateEmail(v) {
    if (!v || !/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(v)) return 'Format email invalide.';
    var dom = v.split('@')[1].toLowerCase();
    for (var i = 0; i < TEMP_DOMAINS.length; i++) { if (dom.indexOf(TEMP_DOMAINS[i]) >= 0) return 'Adresses temporaires non acceptées.'; }
    return null;
  }
  function validatePhone(v) {
    if (!v) return null;
    var c = v.replace(/[\s.\-()]/g,'');
    if (/^0[1-9]\d{8}$/.test(c) || /^\+33[1-9]\d{8}$/.test(c)) {
      if (/^(.)\1+$/.test(c.replace(/\D/g,''))) return 'Numéro invalide.';
      return null;
    }
    return 'Format : 06 12 34 56 78 ou +33 6 12 34 56 78';
  }

  /* ─── ÉTAT ───────────────────────────────────────────── */
  var history         = [];
  var isOpen          = false;
  var isBusy          = false;
  var devisDone       = false;
  var checkboxesDone  = false;
  var currentDevisRecap = null;
  var currentDevis    = null;
  var currentPack     = null;
  var isFullpage      = false;
  var $msgs, $inp, $sendBtn, $emailArea;
  var coordAttempts   = { nom: 0, email: 0 };

  /* ─── PRIX ───────────────────────────────────────────── */
  function calcPrice(d) {
    var t = PACKS[d.pack] || 0;
    var opts = d.options || [];
    for (var i = 0; i < opts.length; i++) {
      var o = opts[i];
      if (o && typeof o === 'object') t += (Number(o.prix) || 0) * (Number(o.quantite) || 1);
    }
    return t;
  }

  /* ─── HELPERS ────────────────────────────────────────── */
  function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function escAttr(s) { return String(s||'').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function addMsg(text, role) {
    var d = document.createElement('div');
    d.className = 'lyaeco-msg lyaeco-msg-' + role;
    var html = text
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\n/g,'<br>')
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
    d.innerHTML = '<div class="lyaeco-bubble-msg">' + html + '</div>';
    $msgs.appendChild(d);
    requestAnimationFrame(function(){ d.classList.add('lyaeco-msg-in'); });
    scroll();
    return d;
  }
  function addTyping() {
    var d = document.createElement('div');
    d.id = 'lyaeco-typing';
    d.className = 'lyaeco-msg lyaeco-msg-bot lyaeco-msg-in';
    d.innerHTML = '<div class="lyaeco-bubble-msg lyaeco-typing"><span></span><span></span><span></span></div>';
    $msgs.appendChild(d); scroll();
  }
  function rmTyping() { var e = document.getElementById('lyaeco-typing'); if (e) e.parentNode.removeChild(e); }
  function scroll() { $msgs.scrollTop = $msgs.scrollHeight; }
  function setInputEnabled(ok) { $inp.disabled = !ok; $sendBtn.disabled = !ok; }

  /* ─── API ────────────────────────────────────────────── */
  function greet() {
    addTyping();
    setTimeout(function(){
      rmTyping();
      var msg = 'Bonjour ! 👋 Je suis l\'assistant LYAECO.\n\nEn quelques questions, je vais vous proposer la formule idéale pour votre site web — **gratuit et sans engagement**.\n\nPour commencer : **quel est votre métier ou secteur d\'activité ?**';
      addMsg(msg, 'bot');
      history.push({ role:'assistant', content: 'Bonjour ! Je suis l\'assistant LYAECO. En quelques questions, je vais vous proposer la formule idéale pour votre site web. Pour commencer : quel est votre métier ou secteur d\'activité ?' });
    }, 900);
  }

  function callApi() {
    fetch('chat-api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history })
    })
    .then(function(r) {
      console.log('[LYAECO] HTTP:', r.status);
      return r.text().then(function(txt){
        try { return JSON.parse(txt); }
        catch(e) { console.error('[LYAECO] Non-JSON:', txt.substring(0,300)); throw new Error('invalid_json'); }
      });
    })
    .then(function(data){
      console.log('[LYAECO] raw:', JSON.stringify(data).substring(0, 400));
      rmTyping();
      if (data.error) {
        addMsg('⚠️ ' + data.error, 'bot');
        setInputEnabled(true); isBusy = false; return;
      }

      /* Detect pack from text when not yet known */
      if (!currentPack && data.message) {
        var ml = data.message;
        if (/\bm3\b|site achat|e[\-\s]?commerce|boutique e/i.test(ml)) currentPack = 'M3';
        else if (/\bm2\b|site r.servation|r.servation en ligne/i.test(ml)) currentPack = 'M2';
        else if (/\bm1\b|site vitrine\b/i.test(ml)) currentPack = 'M1';
      }

      if (data.message) {
        addMsg(data.message, 'bot');
        history.push({ role:'assistant', content: data.message });
      }

      /* Checkboxes Q3 */
      if (data.checkboxes) {
        if (data.checkboxes.pack) currentPack = data.checkboxes.pack;
        console.log('[LYAECO] ✓ CHECKBOXES_JSON reçu, pack:', data.checkboxes.pack);
        setTimeout(function(){ renderCheckboxes(data.checkboxes); }, 300);
        setInputEnabled(false); isBusy = false; return;
      }

      /* Fallback: CHECKBOXES_JSON absent mais le message parle d'options */
      if (!checkboxesDone && !devisDone && !data.devis_recap && !data.devis && currentPack && data.message) {
        var ml2 = data.message.toLowerCase();
        var looksLikeOptions = ml2.indexOf('fonctionnalit') >= 0 ||
          ml2.indexOf('passons aux option') >= 0 ||
          (ml2.indexOf('souhaitez-vous ajouter') >= 0 && ml2.indexOf('option') >= 0);
        if (looksLikeOptions) {
          console.log('[LYAECO] MARQUEUR MANQUANT — fallback checkboxes, pack:', currentPack);
          var fb = getFallbackCheckboxes(currentPack);
          setTimeout(function(){ renderCheckboxes(fb); }, 500);
          setInputEnabled(false); isBusy = false; return;
        }
      }

      /* Devis recap Q8 */
      if (data.devis_recap && !devisDone) {
        currentDevisRecap = data.devis_recap;
        if (data.devis_recap.pack) currentPack = data.devis_recap.pack;
        setTimeout(function(){ renderDevisRecap(data.devis_recap); }, 400);
        setInputEnabled(false); isBusy = false; return;
      }

      /* Final devis (fallback / Q9) */
      if (data.devis && !devisDone) {
        devisDone = true; currentDevis = data.devis;
        if (!currentDevisRecap) setTimeout(function(){ renderDevis(data.devis); }, 500);
        else setTimeout(showCoordForm, 300);
        setInputEnabled(false); isBusy = false; return;
      }

      setInputEnabled(true); isBusy = false;
      setTimeout(function(){ $inp.focus(); }, 50);
    })
    .catch(function(err){
      console.error('[LYAECO] Error:', err);
      rmTyping();
      var msg = location.protocol === 'file:'
        ? '⚠️ Testez depuis un serveur PHP (pas en ouvrant le fichier directement).'
        : '❌ Erreur de connexion. Réessayez ou contactez-nous par <a href="https://wa.me/33781712324" target="_blank" style="color:#fff;text-decoration:underline">WhatsApp</a>.';
      addMsg(msg, 'bot');
      setInputEnabled(true); isBusy = false;
    });
  }

  function send() {
    var text = $inp.value.trim();
    if (!text || isBusy) return;
    $inp.value = '';
    isBusy = true; setInputEnabled(false);
    addMsg(text, 'user');
    history.push({ role:'user', content: text });
    addTyping(); callApi();
  }

  /* ─── CHECKBOXES (Q3) ────────────────────────────────── */
  function renderCheckboxes(cbData) {
    checkboxesDone = true;
    var opts = cbData.options || [];
    var html = '<div class="lyaeco-cbs">' +
      '<div class="lyaeco-cbs-ttl">' + escHtml(cbData.question || 'Fonctionnalités souhaitées') + '</div>';

    for (var i = 0; i < opts.length; i++) {
      var o = opts[i];
      var unite = o.unite ? '/' + o.unite : '';
      html += '<label class="lyaeco-cb-row">' +
        '<input type="checkbox" class="lyaeco-cb-input" data-prix="' + (o.prix||0) + '" data-idx="' + i + '">' +
        '<span class="lyaeco-cb-lbl">' + escHtml(o.label||'') + '</span>' +
        '<span class="lyaeco-opt-p">+' + (o.prix||0) + '€' + escHtml(unite) + '</span>' +
      '</label>';
    }

    html += '<div class="lyaeco-cbs-sub" id="lyaeco-cbs-sub">Aucune option sélectionnée</div>' +
      '<button class="lyaeco-cbs-btn" id="lyaeco-cbs-validate">Valider mes choix →</button>' +
    '</div>';

    var wrap = document.createElement('div');
    wrap.className = 'lyaeco-msg lyaeco-msg-bot lyaeco-msg-in';
    wrap.innerHTML = '<div class="lyaeco-bubble-msg lyaeco-bubble-ui">' + html + '</div>';
    $msgs.appendChild(wrap); scroll();

    var cbs = wrap.querySelectorAll('.lyaeco-cb-input');
    var subEl = wrap.querySelector('#lyaeco-cbs-sub');

    function updateSub() {
      var t = 0;
      for (var k = 0; k < cbs.length; k++) if (cbs[k].checked) t += Number(cbs[k].dataset.prix)||0;
      subEl.textContent = t > 0 ? 'Sous-total options : +' + t + '€' : 'Aucune option sélectionnée';
    }
    for (var j = 0; j < cbs.length; j++) cbs[j].addEventListener('change', updateSub);

    wrap.querySelector('#lyaeco-cbs-validate').addEventListener('click', function(){
      var selected = [];
      for (var k = 0; k < cbs.length; k++) {
        if (cbs[k].checked) selected.push(opts[parseInt(cbs[k].dataset.idx)]);
      }
      wrap.querySelector('#lyaeco-cbs-validate').disabled = true;
      for (var k = 0; k < cbs.length; k++) cbs[k].disabled = true;

      var msg = selected.length === 0
        ? "Je ne souhaite aucune option supplémentaire pour l'instant."
        : "Je souhaite : " + selected.map(function(o){ return o.label + " (+" + o.prix + "€)"; }).join(", ") + ".";

      addMsg(msg, 'user');
      history.push({ role:'user', content: msg });
      isBusy = true; addTyping(); callApi();
    });
  }

  /* ─── DEVIS RECAP (Q8) ───────────────────────────────── */
  function renderDevisRecap(rd) {
    var opts = rd.options || [];
    var optsHtml = '';
    for (var i = 0; i < opts.length; i++) {
      optsHtml += '<li>' + escHtml(opts[i].label||'') +
        ' <span class="lyaeco-opt-p">+' + (opts[i].prix||0) + '€</span></li>';
    }
    var maint = rd.maintenance;

    var html = '<div class="lyaeco-recap">' +
      '<div class="lyaeco-devis-ttl">🎯 Récapitulatif de votre devis</div>' +
      '<div class="lyaeco-recap-pack">' +
        '<span class="lyaeco-recap-pack-name">' + escHtml(rd.pack_label || PACK_LABELS[rd.pack] || rd.pack) + '</span>' +
        '<span class="lyaeco-opt-p">' + (rd.pack_prix || PACKS[rd.pack] || 0) + '€</span>' +
      '</div>' +
      (optsHtml ? '<ul class="lyaeco-devis-opts">' + optsHtml + '</ul>' : '') +
      '<div class="lyaeco-devis-tot"><span>Total HT</span><strong>' + (rd.total_ht||0) + '€</strong></div>' +
      (maint ? '<p class="lyaeco-maint-note">+ ' + maint.prix + '€/mois · maintenance technique uniquement</p>' : '') +
      '<div class="lyaeco-recap-btns">' +
        '<button class="lyaeco-recap-ok" id="lyaeco-recap-ok">✓ Ce devis me convient</button>' +
        '<button class="lyaeco-recap-mod" id="lyaeco-recap-mod">✏️ Modifier mes choix</button>' +
      '</div>' +
    '</div>';

    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    $msgs.appendChild(wrap); scroll();

    wrap.querySelector('#lyaeco-recap-ok').addEventListener('click', function(){
      wrap.querySelector('#lyaeco-recap-ok').disabled = true;
      wrap.querySelector('#lyaeco-recap-mod').disabled = true;
      devisDone = true;
      setTimeout(showCoordForm, 200);
    });
    wrap.querySelector('#lyaeco-recap-mod').addEventListener('click', function(){
      wrap.querySelector('#lyaeco-recap-ok').disabled = true;
      wrap.querySelector('#lyaeco-recap-mod').disabled = true;
      addMsg('Je voudrais modifier mes choix.', 'user');
      history.push({ role:'user', content: "Je voudrais revenir sur mes fonctionnalités souhaitées et modifier ma sélection." });
      isBusy = true; setInputEnabled(false); addTyping(); callApi();
    });
  }

  /* ─── DEVIS FINAL (fallback sans recap) ──────────────── */
  function renderDevis(d) {
    var price = calcPrice(d);
    var opts = d.options || [];
    var optsHtml = ''; var hasMaint = false; var maintPrix = 0;
    for (var i = 0; i < opts.length; i++) {
      var o = opts[i];
      if (!o || typeof o !== 'object') continue;
      var isMaint = (o.nom||'').toLowerCase().indexOf('maintenance') >= 0;
      if (isMaint) { hasMaint = true; maintPrix = o.prix||0; }
      var ps = (o.prix||0) * (o.quantite||1);
      var prixStr = ps > 0 ? '+' + ps + '€' + (isMaint ? '/mois' : '') : '';
      optsHtml += '<li>✓ ' + escHtml(o.nom||'') + (prixStr ? ' <span class="lyaeco-opt-p">' + prixStr + '</span>' : '') + '</li>';
    }
    if (!optsHtml) optsHtml = '<li style="color:#94a3b8">Aucune option supplémentaire</li>';

    var html = '<div class="lyaeco-devis">' +
      '<div class="lyaeco-devis-ttl">🎯 Votre devis estimé</div>' +
      '<div class="lyaeco-devis-pack"><strong>' + escHtml(PACK_LABELS[d.pack]||d.pack) + '</strong>' +
        '<span>' + escHtml(PACK_DESC[d.pack]||'') + '</span></div>' +
      (d.resume ? '<p class="lyaeco-devis-res">&laquo;&nbsp;' + escHtml(d.resume) + '&nbsp;&raquo;</p>' : '') +
      '<ul class="lyaeco-devis-opts">' + optsHtml + '</ul>' +
      '<div class="lyaeco-devis-tot"><span>Total estimé</span><strong>' + price + '€</strong></div>' +
      (hasMaint ? '<p class="lyaeco-maint-note">+ ' + maintPrix + '€/mois · maintenance technique uniquement</p>' : '') +
      '<button class="lyaeco-btn-email" id="lyaeco-devis-cta">📩 Recevoir ce devis par email</button>' +
    '</div>';

    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    $msgs.appendChild(wrap); scroll();
    wrap.querySelector('#lyaeco-devis-cta').addEventListener('click', showCoordForm);
  }

  /* ─── FORMULAIRE COORDONNÉES (après confirmation recap) ─ */
  function showCoordForm() {
    $emailArea.style.display = 'block';
    $emailArea.innerHTML =
      '<div class="lyaeco-ef" id="lyaeco-coord-form">' +
        '<p>📋 Pour recevoir votre devis par email :</p>' +
        '<div class="lyaeco-field-wrap">' +
          '<input type="text"  id="lyaeco-ef-nom"        placeholder="Prénom et Nom *" />' +
          '<div class="lyaeco-field-err" id="lyaeco-err-nom"></div>' +
        '</div>' +
        '<div class="lyaeco-field-wrap">' +
          '<input type="email" id="lyaeco-ef-email"      placeholder="Adresse email *" />' +
          '<div class="lyaeco-field-err" id="lyaeco-err-email"></div>' +
        '</div>' +
        '<div class="lyaeco-field-wrap">' +
          '<input type="tel"   id="lyaeco-ef-tel"        placeholder="Téléphone (ex: 06 12 34 56 78)" />' +
          '<div class="lyaeco-field-err" id="lyaeco-err-tel"></div>' +
        '</div>' +
        '<input type="text"   id="lyaeco-ef-entreprise"  placeholder="Nom de votre entreprise" />' +
        '<input type="text"   id="lyaeco-ef-adresse"     placeholder="Adresse postale" />' +
        '<label class="lyaeco-audit-cb"><input type="checkbox" id="lyaeco-ef-audit" checked> ☎️ Je souhaite être rappelé(e) pour un <strong>audit téléphonique gratuit</strong></label>' +
        '<button id="lyaeco-ef-send" class="lyaeco-ef-btn">Recevoir mon devis →</button>' +
        '<p class="lyaeco-ef-note">Sans engagement · Réponse sous 24h</p>' +
      '</div>';

    document.getElementById('lyaeco-ef-send').addEventListener('click', submitCoord);
    document.getElementById('lyaeco-ef-nom').focus();
    scroll();
  }

  function setFieldErr(id, errId, msg) {
    var el = document.getElementById(id);
    var errEl = document.getElementById(errId);
    if (!el || !errEl) return;
    el.classList.toggle('lyaeco-err', !!msg);
    errEl.textContent = msg || '';
  }

  function submitCoord() {
    var nom        = document.getElementById('lyaeco-ef-nom').value.trim();
    var email      = document.getElementById('lyaeco-ef-email').value.trim();
    var tel        = document.getElementById('lyaeco-ef-tel').value.trim();
    var entreprise = document.getElementById('lyaeco-ef-entreprise').value.trim();
    var adresse    = document.getElementById('lyaeco-ef-adresse').value.trim();
    var auditEl    = document.getElementById('lyaeco-ef-audit');
    var auditTel   = auditEl ? auditEl.checked : false;

    var errNom   = validateName(nom);
    var errEmail = validateEmail(email);
    var errTel   = validatePhone(tel);

    if (errNom)   coordAttempts.nom++;
    if (errEmail) coordAttempts.email++;

    setFieldErr('lyaeco-ef-nom',   'lyaeco-err-nom',   errNom);
    setFieldErr('lyaeco-ef-email', 'lyaeco-err-email', errEmail);
    setFieldErr('lyaeco-ef-tel',   'lyaeco-err-tel',   errTel);

    /* Après 3 échecs → redirection WhatsApp */
    if (coordAttempts.nom >= 3 || coordAttempts.email >= 3) {
      $emailArea.innerHTML =
        '<div class="lyaeco-ef lyaeco-ef-ok">' +
          '<div class="lyaeco-ef-icon">💬</div>' +
          '<strong>On préfère vous appeler !</strong>' +
          '<p>Contactez-nous sur WhatsApp, on finalise votre devis ensemble.</p>' +
          '<a href="https://wa.me/33781712324" target="_blank" rel="noopener" class="lyaeco-wa-btn">💬 WhatsApp</a>' +
        '</div>';
      return;
    }

    if (errNom || errEmail || errTel) return;

    var btn = document.getElementById('lyaeco-ef-send');
    btn.disabled = true; btn.textContent = '⏳ Envoi...';

    var rd = currentDevisRecap || {};
    var d  = currentDevis || {};
    var packVal  = rd.pack  || d.pack  || currentPack || '';
    var optsVal  = rd.options || d.options || [];
    var totalVal = rd.total_ht || calcPrice(d) || 0;

    var fd = new FormData();
    fd.append('type',        'devis-ia');
    fd.append('nom',         nom);
    fd.append('email',       email);
    fd.append('telephone',   tel);
    fd.append('entreprise',  entreprise);
    fd.append('adresse',     adresse);
    fd.append('metier',      (d.client && d.client.metier) || '');
    fd.append('pack',        packVal);
    fd.append('options',     JSON.stringify(optsVal));
    fd.append('prix_total',  totalVal);
    fd.append('maintenance',       JSON.stringify(rd.maintenance || null));
    fd.append('references',        d.references || '');
    fd.append('resume',            rd.resume || d.resume || '');
    fd.append('audit_telephonique', auditTel ? '1' : '0');

    fetch('send-mail.php', { method:'POST', body: fd })
    .then(function(r){ return r.json(); })
    .then(function(data){
      if (data.success) {
        $emailArea.innerHTML =
          '<div class="lyaeco-ef lyaeco-ef-ok">' +
            '<div class="lyaeco-ef-icon">✅</div>' +
            '<strong>Devis envoyé !</strong>' +
            '<p>Vérifiez votre boîte mail (et les spams).<br>On vous répond sous 24h.</p>' +
            '<a href="https://wa.me/33781712324" target="_blank" rel="noopener" class="lyaeco-wa-btn">💬 Continuer sur WhatsApp</a>' +
          '</div>';
      } else {
        btn.disabled = false; btn.textContent = 'Recevoir mon devis →';
        alert('Erreur : ' + (data.message || 'Réessayez ou contactez-nous par WhatsApp.'));
      }
    })
    .catch(function(){
      btn.disabled = false; btn.textContent = 'Recevoir mon devis →';
      alert('Erreur de connexion. Contactez-nous directement sur WhatsApp.');
    });
  }

  /* ─── WIDGET ─────────────────────────────────────────── */
  function openChat() {
    isOpen = true;
    document.getElementById('lyaeco-win').classList.add('lyaeco-open');
    document.getElementById('lyaeco-win').setAttribute('aria-hidden','false');
    document.getElementById('lyaeco-btn').classList.add('lyaeco-btn-active');
    var b = document.getElementById('lyaeco-bubble');
    if (b) b.style.display = 'none';
    if (history.length === 0) setTimeout(greet, 300);
    setTimeout(function(){ $inp.focus(); }, 380);
  }
  function closeChat() {
    isOpen = false;
    document.getElementById('lyaeco-win').classList.remove('lyaeco-open');
    document.getElementById('lyaeco-win').setAttribute('aria-hidden','true');
    document.getElementById('lyaeco-btn').classList.remove('lyaeco-btn-active');
  }

  function buildWidget() {
    var img = 'images/assistant-ia.png.png';
    var inner =
      '<div class="lyaeco-hdr">' +
        '<div class="lyaeco-hdr-info">' +
          '<img src="' + img + '" alt="" class="lyaeco-hdr-img">' +
          '<div><div class="lyaeco-hdr-name">Assistant LYAECO</div>' +
          '<div class="lyaeco-hdr-status"><span class="lyaeco-dot"></span> En ligne</div></div>' +
        '</div>' +
        '<button class="lyaeco-x" id="lyaeco-close" aria-label="Fermer le chat">×</button>' +
      '</div>' +
      '<div class="lyaeco-msgs" id="lyaeco-msgs"></div>' +
      '<div class="lyaeco-email-area" id="lyaeco-email-area" style="display:none"></div>' +
      '<div class="lyaeco-input-row">' +
        '<input type="text" id="lyaeco-inp" placeholder="Votre réponse..." autocomplete="off">' +
        '<button id="lyaeco-send" aria-label="Envoyer">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15">' +
            '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>' +
          '</svg>' +
        '</button>' +
      '</div>';

    document.body.insertAdjacentHTML('beforeend',
      '<div id="lyaeco-chatbot">' +
        '<div class="lyaeco-bubble" id="lyaeco-bubble">' +
          '<span>💬 Devis gratuit en 2 min ?</span>' +
          '<button class="lyaeco-bubble-x" id="lyaeco-bubble-x" aria-label="Fermer">×</button>' +
        '</div>' +
        '<button class="lyaeco-btn" id="lyaeco-btn" aria-label="Ouvrir l\'assistant devis LYAECO">' +
          '<img src="' + img + '" alt="">' +
        '</button>' +
        '<div class="lyaeco-win" id="lyaeco-win" aria-hidden="true">' + inner + '</div>' +
      '</div>');

    $msgs = document.getElementById('lyaeco-msgs');
    $inp  = document.getElementById('lyaeco-inp');
    $sendBtn = document.getElementById('lyaeco-send');
    $emailArea = document.getElementById('lyaeco-email-area');

    document.getElementById('lyaeco-btn').addEventListener('click', function(){ isOpen ? closeChat() : openChat(); });
    document.getElementById('lyaeco-close').addEventListener('click', closeChat);
    document.getElementById('lyaeco-bubble-x').addEventListener('click', function(){ document.getElementById('lyaeco-bubble').style.display='none'; });
    $sendBtn.addEventListener('click', send);
    $inp.addEventListener('keypress', function(e){ if (e.key==='Enter') send(); });

    setTimeout(function(){
      if (!isOpen) {
        var b = document.getElementById('lyaeco-bubble');
        b.style.display = 'flex';
        requestAnimationFrame(function(){ b.classList.add('lyaeco-bubble-in'); });
      }
    }, 5000);
    setInterval(function(){
      if (!isOpen) {
        var btn = document.getElementById('lyaeco-btn');
        btn.classList.add('lyaeco-bounce');
        setTimeout(function(){ btn.classList.remove('lyaeco-bounce'); }, 900);
      }
    }, 8000);
  }

  function buildFullpage(container) {
    var img = 'images/assistant-ia.png.png';
    container.innerHTML =
      '<div class="lyaeco-hdr">' +
        '<div class="lyaeco-hdr-info">' +
          '<img src="' + img + '" alt="" class="lyaeco-hdr-img">' +
          '<div><div class="lyaeco-hdr-name">Assistant LYAECO</div>' +
          '<div class="lyaeco-hdr-status"><span class="lyaeco-dot"></span> En ligne</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="lyaeco-msgs" id="lyaeco-msgs"></div>' +
      '<div class="lyaeco-email-area" id="lyaeco-email-area" style="display:none"></div>' +
      '<div class="lyaeco-input-row">' +
        '<input type="text" id="lyaeco-inp" placeholder="Votre réponse..." autocomplete="off">' +
        '<button id="lyaeco-send" aria-label="Envoyer">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15">' +
            '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>' +
          '</svg>' +
        '</button>' +
      '</div>';

    $msgs = document.getElementById('lyaeco-msgs');
    $inp  = document.getElementById('lyaeco-inp');
    $sendBtn = document.getElementById('lyaeco-send');
    $emailArea = document.getElementById('lyaeco-email-area');

    $sendBtn.addEventListener('click', send);
    $inp.addEventListener('keypress', function(e){ if (e.key==='Enter') send(); });
    isOpen = true;
    setTimeout(greet, 600);
  }

  function init() {
    var fp = document.getElementById('lyaeco-chat-inline');
    if (fp) { isFullpage = true; buildFullpage(fp); }
    else     { buildWidget(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
