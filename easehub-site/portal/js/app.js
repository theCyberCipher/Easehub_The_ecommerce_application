  const KEY = 'easehub-portal', SESSION = 'easehub-session', UNLOCK = 500;
  const AVATARS = ['🎓', '📚', '🦊', '🐼', '🦁', '🐨', '🐸', '🌟', '🚀', '🎯'];
  const SERVICES = [
    { name: 'Mess plan (monthly)', icon: '🍱', price: 2400 },
    { name: 'PG room (monthly)', icon: '🏠', price: 6500 },
    { name: 'Laundry pickup (monthly)', icon: '🧺', price: 600 },
    { name: 'Room cleaning (monthly)', icon: '🧹', price: 800 },
    { name: 'Study desk (per day)', icon: '📚', price: 60 },
    { name: 'Bike rental (weekly)', icon: '🚲', price: 350 },
  ];
  const $ = id => document.getElementById(id);
  const fmt = n => n.toLocaleString('en-IN');
  const money = n => '₹' + fmt(n);
  const today = () => new Date().toISOString().slice(0, 10);
  const el = (tag, props = {}, ...kids) => {
    const e = document.createElement(tag);
    Object.assign(e, props);
    e.append(...kids);
    return e;
  };

  // ---------- Demo data (stored per browser) ----------
  const SEED = {
    admin: { name: 'Administrator', email: 'admin@easehub.example', password: 'admin123' },
    students: [
      { id: 's1', name: 'Riya Sharma', email: 'student@easehub.example', password: 'student123', phone: '+91 90000 11111', avatar: '🎓', coins: 420, lastCheckin: null,
        history: [{ reason: 'Welcome bonus', amount: 420 }], bookings: [], feedback: [] },
      { id: 's2', name: 'Aman Verma', email: 'aman@easehub.example', password: 'student123', phone: '+91 90000 22222', avatar: '🦊', coins: 620, lastCheckin: null,
        history: [{ reason: 'Welcome bonus', amount: 620 }], bookings: [], feedback: [] },
    ],
    rewards: [
      { id: 'r1', name: 'Spiral Notebook', icon: '📓', cost: 150 },
      { id: 'r2', name: 'Notebook Set (5)', icon: '📚', cost: 350 },
      { id: 'r3', name: 'Pen Set', icon: '🖊️', cost: 120 },
      { id: 'r4', name: 'Steel Water Bottle', icon: '🍶', cost: 260 },
      { id: 'r5', name: 'Laptop Bag', icon: '💻', cost: 700 },
      { id: 'r6', name: 'Backpack', icon: '🎒', cost: 900 },
    ],
    redemptions: [],
  };

  function load() {
    let d;
    try { const raw = localStorage.getItem(KEY); d = raw ? JSON.parse(raw) : structuredClone(SEED); }
    catch (_) { d = structuredClone(SEED); }
    // Fill in fields that older saved data may not have
    d.students.forEach(s => {
      s.phone = s.phone || '+91 90000 00000';
      s.avatar = s.avatar || '🎓';
      s.bookings = s.bookings || [];
      s.feedback = s.feedback || [];
      s.history = s.history || [];
    });
    return d;
  }
  let db = load();
  let session = loadSession();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (_) {} }
  function loadSession() { try { return JSON.parse(localStorage.getItem(SESSION)); } catch (_) { return null; } }
  function setSession(s) {
    session = s;
    try { s ? localStorage.setItem(SESSION, JSON.stringify(s)) : localStorage.removeItem(SESSION); } catch (_) {}
  }

  let toastTimer;
  function toast(msg) {
    $('toast').textContent = msg;
    $('toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2400);
  }

  // ---------- Login (same form for both roles) ----------
  function findAccount(email, password) {
    email = email.trim().toLowerCase();
    if (email === db.admin.email && password === db.admin.password) return { role: 'admin' };
    const s = db.students.find(x => x.email === email && x.password === password);
    return s ? { role: 'student', id: s.id } : null;
  }
  $('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const account = findAccount(f.get('email'), f.get('password'));
    if (!account) { $('loginErr').textContent = 'Wrong email or password.'; return; }
    $('loginErr').textContent = '';
    setSession(account);
    e.target.reset();
    show();
    toast(account.role === 'admin' ? 'Signed in as administrator' : 'Welcome back!');
  });
  const openMenu = () => { $('drawer').classList.add('open'); $('overlay').classList.add('open'); };
  const closeMenu = () => { $('drawer').classList.remove('open'); $('overlay').classList.remove('open'); };
  $('menuBtn').addEventListener('click', openMenu);
  $('closeMenu').addEventListener('click', closeMenu);
  $('overlay').addEventListener('click', closeMenu);
  document.querySelectorAll('.drawer-list [data-tab]').forEach(b => b.addEventListener('click', () => { closeMenu(); setTab(b.dataset.tab); }));
  $('drawerLogout').addEventListener('click', () => { closeMenu(); setSession(null); show(); toast('You have been logged out'); });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  $('avatarBtn').addEventListener('click', () => { setTab('profile'); });

  function show() {
    const loggedIn = !!session;
    const isStudent = loggedIn && session.role === 'student';
    $('loginView').hidden = loggedIn;
    $('studentView').hidden = !isStudent;
    $('adminView').hidden = !(loggedIn && session.role === 'admin');
    $('menuBtn').hidden = !loggedIn;
    document.querySelectorAll('.student-only').forEach(x => { x.hidden = !isStudent; });
    $('avatarBtn').hidden = !isStudent;
    $('roleTag').hidden = !loggedIn;
    $('roleTag').textContent = loggedIn ? (session.role === 'admin' ? 'Admin' : 'Student') : '';
    if (isStudent) { const s = currentStudent(); if (!s) { setSession(null); return show(); } $('avatarBtn').textContent = s.avatar; renderStudentAll(); }
    if (loggedIn && session.role === 'admin') renderAdmin();
  }

  // ---------- Student tabs ----------
  let activeTab = 'overview';
  function setTab(name) {
    activeTab = name;
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    ['overview', 'rewards', 'redeemed', 'bookings', 'feedback', 'profile'].forEach(n => { $('tab-' + n).hidden = n !== name; });
    renderStudentAll();
  }
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

  const currentStudent = () => db.students.find(s => s.id === session.id);

  function renderStudentAll() {
    const s = currentStudent();
    if (!s) return;
    $('welcome').textContent = `Hi, ${s.name.split(' ')[0]} 👋`;
    if (activeTab === 'overview') renderOverview(s);
    if (activeTab === 'rewards') renderRewards(s);
    if (activeTab === 'redeemed') renderRedeemed(s);
    if (activeTab === 'bookings') renderBookings(s);
    if (activeTab === 'feedback') renderFeedback(s);
    if (activeTab === 'profile') renderProfile(s);
  }

  function totalBooked(s) { return s.bookings.filter(b => b.status !== 'Cancelled').reduce((sum, b) => sum + b.amount, 0); }
  function myRedemptions(s) { return db.redemptions.filter(r => r.studentId === s.id).slice().reverse(); }

  // ---------- Overview ----------
  function renderOverview(s) {
    $('coins').textContent = fmt(s.coins);
    $('barFill').style.width = Math.min(100, s.coins / UNLOCK * 100) + '%';
    $('unlockMsg').textContent = s.coins >= UNLOCK
      ? '🎉 Rewards unlocked! Redeem any item you can afford.'
      : `${fmt(UNLOCK - s.coins)} more coins to unlock rewards (${fmt(UNLOCK)} needed).`;
    $('checkinBtn').disabled = s.lastCheckin === today();
    $('checkinBtn').textContent = s.lastCheckin === today() ? 'Checked in today' : 'Daily check-in +10';
    $('ovBooked').textContent = money(totalBooked(s));
    $('ovOrders').textContent = s.bookings.filter(b => b.status !== 'Cancelled').length;
    $('ovRedeemed').textContent = myRedemptions(s).length;
    $('ovFeedback').textContent = s.feedback.length;
    $('ovHistory').replaceChildren(...(s.history.length ? s.history.slice().reverse().slice(0, 6).map(h =>
      el('li', {}, h.reason, el('span', { className: h.amount >= 0 ? 'plus' : 'minus' }, `${h.amount >= 0 ? '+' : ''}${fmt(h.amount)}`))
    ) : [el('li', {}, 'No activity yet')]));
  }

  $('checkinBtn').addEventListener('click', () => {
    const s = currentStudent();
    if (s.lastCheckin === today()) return;
    s.coins += 10;
    s.lastCheckin = today();
    s.history.push({ reason: 'Daily check-in', amount: 10 });
    save(); renderStudentAll(); toast('+10 coins added!');
  });

  // ---------- Rewards ----------
  function renderRewards(s) {
    $('rewards').replaceChildren(...db.rewards.map(r => {
      const unlocked = s.coins >= UNLOCK, canAfford = s.coins >= r.cost;
      const btn = el('button', { className: 'btn-sm', disabled: !(unlocked && canAfford), onclick: () => redeem(r.id) },
        !unlocked ? 'Locked' : canAfford ? 'Redeem' : 'Not enough coins');
      return el('div', { className: 'reward' + (unlocked ? '' : ' locked') },
        el('div', { className: 'ico' }, r.icon), el('h3', {}, r.name), el('div', { className: 'cost' }, `${fmt(r.cost)} coins`), btn);
    }));
  }

  function redeem(rewardId) {
    const s = currentStudent(), r = db.rewards.find(x => x.id === rewardId);
    if (s.coins < UNLOCK) return toast(`Reach ${fmt(UNLOCK)} coins to unlock rewards.`);
    if (s.coins < r.cost) return toast('Not enough coins for this item.');
    s.coins -= r.cost;
    s.history.push({ reason: `Redeemed ${r.name}`, amount: -r.cost });
    db.redemptions.push({ id: Date.now().toString(36), studentId: s.id, studentName: s.name, item: r.name, icon: r.icon, cost: r.cost, status: 'Pending', date: today() });
    save(); renderStudentAll(); toast(`${r.name} ordered!`);
  }

  // ---------- Redeemed history ----------
  function renderRedeemed(s) {
    const list = myRedemptions(s);
    $('spentCoins').textContent = fmt(list.reduce((sum, r) => sum + r.cost, 0)) + ' 🪙';
    $('redeemedList').replaceChildren(...(list.length ? list.map(r => el('div', { className: 'item' },
      el('span', { className: 'grow' }, `${r.icon} ${r.item}`, el('div', { className: 'sub' }, `${r.date} · ${fmt(r.cost)} coins`)),
      el('span', { className: 'pill ' + r.status }, r.status))) : [el('p', { className: 'muted' }, 'No rewards redeemed yet.')]));
  }

  // ---------- Booked orders ----------
  function renderBookings(s) {
    $('bookTotal').textContent = money(totalBooked(s));
    const sel = $('serviceSel');
    if (!sel.options.length) SERVICES.forEach((sv, i) => sel.append(el('option', { value: i }, `${sv.icon} ${sv.name} · ${money(sv.price)}`)));
    const dateInput = document.querySelector('#bookForm input[name=date]');
    dateInput.min = today();
    $('bookingList').replaceChildren(...(s.bookings.length ? s.bookings.slice().reverse().map(b => {
      const cancel = b.status === 'Confirmed'
        ? el('button', { className: 'btn-ghost', onclick: () => cancelBooking(b.id) }, 'Cancel')
        : null;
      return el('div', { className: 'item' },
        el('span', { className: 'grow' }, `${b.icon} ${b.service}`, el('div', { className: 'sub' }, `For ${b.date} · ${money(b.amount)}`)),
        el('span', { className: 'pill ' + b.status }, b.status), cancel || '');
    }) : [el('p', { className: 'muted' }, 'No bookings yet. Book a service above.')]));
  }

  $('bookForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const sv = SERVICES[Number(f.get('service'))];
    const s = currentStudent();
    s.bookings.push({ id: Date.now().toString(36), service: sv.name, icon: sv.icon, amount: sv.price, date: f.get('date'), status: 'Confirmed' });
    save(); e.target.reset(); renderStudentAll(); toast(`${sv.name} booked!`);
  });

  function cancelBooking(id) {
    const b = currentStudent().bookings.find(x => x.id === id);
    b.status = 'Cancelled';
    save(); renderStudentAll(); toast('Booking cancelled');
  }

  // ---------- Feedback ----------
  let rating = 5;
  function renderStars() {
    $('starsInput').replaceChildren(...[1, 2, 3, 4, 5].map(n => el('button', {
      type: 'button', className: n <= rating ? 'on' : '', 'aria-label': `${n} stars`,
      onclick: () => { rating = n; renderStars(); }
    }, '★')));
  }
  function renderFeedback(s) {
    const sel = $('fbService');
    if (!sel.options.length) {
      SERVICES.forEach(sv => sel.append(el('option', {}, sv.name)));
      sel.append(el('option', {}, 'Easehub app and website'));
    }
    renderStars();
    $('feedbackList').replaceChildren(...(s.feedback.length ? s.feedback.slice().reverse().map(f => el('div', { className: 'item' },
      el('span', { className: 'grow' }, f.text, el('div', { className: 'sub' }, `${f.service} · ${f.date}`)),
      el('span', { className: 'stars' }, '★'.repeat(f.rating) + '☆'.repeat(5 - f.rating)))) : [el('p', { className: 'muted' }, 'You have not given any feedback yet.')]));
  }
  $('feedbackForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    currentStudent().feedback.push({ service: f.get('service'), rating, text: f.get('text').trim(), date: today() });
    save(); e.target.reset(); rating = 5; renderStudentAll(); toast('Thanks for your feedback!');
  });

  // ---------- Profile: avatar and verified contact changes ----------
  let pending = null; // { field, value, code }

  function renderProfile(s) {
    $('avatarOptions').replaceChildren(...AVATARS.map(a => el('button', {
      className: 'av' + (a === s.avatar ? ' on' : ''),
      onclick: () => { s.avatar = a; save(); $('avatarBtn').textContent = a; renderProfile(s); toast('Profile picture updated'); }
    }, a)));

    $('contactBox').replaceChildren(
      contactRow(s, 'phone', 'Phone number', s.phone, /^\+?[0-9 ]{8,15}$/, 'Enter a valid phone number'),
      contactRow(s, 'email', 'Email address', s.email, /^\S+@\S+\.\S+$/, 'Enter a valid email address')
    );
  }

  function contactRow(s, field, label, current, pattern, errorMsg) {
    const wrap = el('div', { className: 'contact-row' });
    const head = el('div', {}, el('div', { className: 'muted' }, label), el('div', { className: 'v' }, current));
    wrap.append(head);

    if (pending && pending.field === field) {
      const box = el('div', { className: 'verify' });
      const codeInput = el('input', { placeholder: 'Enter the 6-digit code', maxLength: 6, inputMode: 'numeric' });
      box.append(
        el('p', { className: 'demo' }, `Demo mode: no SMS or email is sent. Your code is ${pending.code}.`),
        el('p', { className: 'muted' }, `Enter the code to change your ${label.toLowerCase()} to ${pending.value}.`),
        codeInput,
        el('div', { className: 'row2' },
          el('button', { className: 'btn-sm', onclick: () => verify(codeInput.value) }, 'Verify and save'),
          el('button', { className: 'btn-ghost', onclick: () => { pending = null; renderProfile(s); } }, 'Cancel'))
      );
      wrap.append(box);
      return wrap;
    }

    const input = el('input', { type: field === 'email' ? 'email' : 'tel', placeholder: `New ${label.toLowerCase()}` });
    const btn = el('button', { className: 'btn-sm', onclick: () => {
      const value = input.value.trim();
      if (!pattern.test(value)) return toast(errorMsg);
      if (field === 'email' && db.students.some(x => x.email === value.toLowerCase() && x.id !== s.id)) return toast('That email is already in use.');
      pending = { field, value: field === 'email' ? value.toLowerCase() : value, code: String(Math.floor(100000 + Math.random() * 900000)) };
      renderProfile(s);
      toast('Verification code sent');
    } }, 'Send code');
    wrap.append(el('div', { className: 'row2', style: 'flex:1;min-width:220px' }, input, btn));
    return wrap;
  }

  function verify(code) {
    if (!pending) return;
    if (code.trim() !== pending.code) return toast('That code does not match. Try again.');
    const s = currentStudent();
    s[pending.field] = pending.value;
    pending = null;
    save(); renderProfile(s); toast('Contact details updated');
  }

  // ---------- Admin ----------
  function renderAdmin() {
    $('statStudents').textContent = db.students.length;
    $('statCoins').textContent = fmt(db.students.reduce((sum, s) => sum + s.coins, 0));
    $('statPending').textContent = db.redemptions.filter(r => r.status !== 'Delivered').length;

    const sel = $('addTo'), prev = sel.value;
    sel.replaceChildren(...db.students.map(s => el('option', { value: s.id }, s.name)));
    if (prev) sel.value = prev;

    $('studentRows').replaceChildren(...db.students.map(s => el('tr', {},
      el('td', {}, s.name), el('td', {}, s.email), el('td', {}, fmt(s.coins)),
      el('td', {}, s.coins >= UNLOCK ? '✅ Unlocked' : `🔒 ${fmt(UNLOCK - s.coins)} to go`))));

    $('adminOrders').replaceChildren(...(db.redemptions.length ? db.redemptions.slice().reverse().map(r => {
      const next = r.status === 'Pending' ? 'Mark shipped' : r.status === 'Shipped' ? 'Mark delivered' : null;
      return el('div', { className: 'item' },
        el('span', { className: 'grow' }, `${r.icon} ${r.item} · ${r.studentName}`),
        el('span', { className: 'pill ' + r.status }, r.status),
        next ? el('button', { className: 'btn-sm', onclick: () => advance(r.id) }, next) : el('span', { className: 'muted' }, 'Completed'));
    }) : [el('p', { className: 'muted' }, 'No redemption requests yet.')]));
  }

  function advance(orderId) {
    const r = db.redemptions.find(x => x.id === orderId);
    r.status = r.status === 'Pending' ? 'Shipped' : 'Delivered';
    save(); renderAdmin(); toast(`Order marked ${r.status.toLowerCase()}`);
  }

  $('addForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const s = db.students.find(x => x.id === f.get('student'));
    const amount = parseInt(f.get('amount'), 10);
    if (!s || !(amount > 0)) return toast('Enter a valid number of coins.');
    s.coins += amount;
    s.history.push({ reason: (f.get('note') || '').trim() || 'Admin reward', amount });
    save(); e.target.reset(); renderAdmin(); toast(`Added ${fmt(amount)} coins to ${s.name}`);
  });

  // ---------- Theme ----------
  function applyTheme(dark) {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    $('themeBtn').textContent = dark ? '☀️' : '🌙';
    try { localStorage.setItem('easehub-theme', dark ? 'dark' : 'light'); } catch (_) {}
  }
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('easehub-theme'); } catch (_) {}
  applyTheme(savedTheme ? savedTheme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
  $('themeBtn').addEventListener('click', () => applyTheme(document.documentElement.dataset.theme !== 'dark'));

  show();
