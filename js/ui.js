import { getUser, clearSession } from './auth.js';

export const COLORS = ['#e8ff47','#ff4f4f','#47c5ff','#ff9f47','#a78bfa','#34d399'];
export const ROLE_CLASS = {
  'Jogador':               'role-jogador',
  'Crítico Especializado': 'role-critico',
  'Administrador':         'role-admin'
};

export function colorFor(name) {
  let h = 0;
  for (const c of (name || '')) h += c.charCodeAt(0);
  return COLORS[h % COLORS.length];
}

export function fmtDate(d) {
  return new Date(d).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });
}

export function starHTML(nota, max = 5) {
  const full = Math.round(parseFloat(nota) || 0);
  return '★'.repeat(full) + '☆'.repeat(Math.max(0, max - full));
}

export function setupNav() {
  const user = getUser();
  document.querySelectorAll('.guest-only').forEach(el =>
    el.style.display = user ? 'none' : ''
  );
  document.querySelectorAll('.auth-only').forEach(el =>
    el.style.display = user ? 'inline-flex' : 'none'
  );
  const nomeEl = document.querySelector('.nav-username');
  if (nomeEl && user) nomeEl.textContent = user.nome;
}

export function logout() {
  clearSession();
  const inPages = location.pathname.includes('/pages/');
  window.location.href = inPages ? '../pages/login.html' : 'pages/login.html';
}

export function getBasePath() {
  const pathParts = location.pathname.split('/').filter(p => p);
  if (pathParts.length > 0 && pathParts[0] === 'gamerate') {
    return '/gamerate/';
  } else {
    return location.pathname.includes('/pages/') ? '../' : './';
  }
}

export function toast(msg, tipo = 'info') {
  const t = document.createElement('div');
  t.className   = `toast toast-${tipo}`;
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 200); }, 3000);
}

export function onDelegated(action, handler) {
  document.addEventListener('click', (e) => {
    const el = e.target.closest(`[data-action="${action}"]`);
    if (el) handler(el, e);
  });
}

export function logoHTML(basePath = '') {
  return `<img src="${basePath}assets/logo.svg" alt="GameRate"/>`;
}

export function footerHTML(basePath = '') {
  return `
    <footer class="footer">
      <a href="${basePath}index.html" class="footer-logo">
        <img src="${basePath}assets/logo.svg" alt="GameRate"/>
      </a>
      <div class="footer-links">
        <a href="${basePath}pages/contato.html">Contato</a>
      </div>
      <div class="footer-copy">© 2025 GameRate</div>
    </footer>`;
}

export function gameCardHTML(game, basePath = '') {
  const nota   = game.nota_media ? parseFloat(game.nota_media).toFixed(1) : '—';
  const imgSrc = game.capa.startsWith('http') ? game.capa : basePath + game.capa.replace('./', '');
  const imgTag = imgSrc
    ? `<img src="${imgSrc}" alt="${game.nome_jogo}" loading="lazy" onerror="this.style.display='none'">`
    : '';

  return `
    <div class="game-card" data-id="${game.id_jogo}" data-action="open-game">
      <div class="card-img-wrap">${imgTag}</div>
      <div class="card-title">${game.nome_jogo}</div>
      <div class="card-meta">
        <div class="card-rating">★ ${nota}</div>
        <div class="card-genre">${game.total_avaliacoes || 0} aval.</div>
      </div>
    </div>`;
}

export function reviewCardHTML(review, index, basePath = '') {
  const pct = review.nota ? (parseFloat(review.nota) / 5 * 100).toFixed(0) : 0;
  const col = colorFor(review.nome_usuario || '');
  const imgSrc = review.capa ? (review.capa.startsWith('http') ? review.capa : basePath + review.capa.replace('./', '')) : '';

  return `
    <div class="review-card" data-id="${review.id_avaliacao}" data-action="open-review">
      <div class="review-game-row">
        <img class="review-game-img"
             src="${imgSrc}" alt="${review.nome_jogo || ''}"
             onerror="this.style.background='var(--surface2)';this.src=''">
        <div style="flex:1;min-width:0">
          <div style="font-size:15px;font-weight:600">${review.nome_jogo || ''}</div>
          <div class="review-score-wrap">
            <div class="review-score">${review.nota || '—'}</div>
            <div class="review-score-bar">
              <div class="review-score-fill" style="width:${pct}%"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="review-title">${review.titulo}</div>
      <div class="review-text">${review.texto}</div>
      <div class="review-footer">
        <div class="review-author">
          <div class="author-avatar" style="background:${col}">
            ${(review.nome_usuario || '?').slice(0,2).toUpperCase()}
          </div>
          <div class="author-name">@${review.nome_usuario || ''}</div>
        </div>
        <div class="review-likes">♥ ${review.total_curtidas || 0}</div>
      </div>
    </div>`;
}
