/* 各頁共用導覽列：回入口／上一站／下一站（依 data/units.json 的年級設定）
   用法：<script src="js/nav.js" data-narrow="820" data-narrow-pos="left|center" defer></script>
   - 導覽列放進 #titleCard 下方一列
   - data-narrow：該頁在這個寬度以下原本會藏起 #titleCard → 改成只顯示導覽列（data-narrow-pos 決定放左上或上方中間）
   - 年級：網址 ?g= → sessionStorage → 預設 3；頁內其他 .html 連結會自動帶上 ?g= */
(() => {
  const me = document.currentScript;
  const narrow = +me.dataset.narrow || 0, center = me.dataset.narrowPos === 'center';
  const file = location.pathname.split('/').pop() || 'index.html';
  const qs = new URLSearchParams(location.search);
  let g = qs.get('g');
  try { if (g) sessionStorage.setItem('babaoGrade', g); else g = sessionStorage.getItem('babaoGrade'); } catch (e) { }
  g = g || '3';

  const css = `
#titleCard{display:grid;grid-template-columns:auto auto;justify-content:start;column-gap:12px}
#titleCard .bnav{grid-column:1/-1;display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:2px}
#titleCard .bnav a{font-size:13.5px;font-weight:800;padding:5px 10px;border-radius:10px;background:rgba(3,105,161,.10);color:#0369a1;text-decoration:none;white-space:nowrap;line-height:1.3}
#titleCard .bnav a:hover{background:rgba(3,105,161,.18)}
#titleCard .bnav a.next{background:#16a34a;color:#fff}
#titleCard .bnav a.fs{background:#0f2a3a;color:#fff}
#titleCard .bnav .pos{font-size:12.5px;color:#64748b;font-weight:700;padding:0 2px}
${narrow ? `@media (max-width:${narrow}px){
  #titleCard{display:flex!important;padding:6px 8px${center ? ';left:50%;transform:translateX(-50%);max-width:none' : ''}}
  #titleCard>.logo,#titleCard>div:not(.bnav){display:none}
  #titleCard .bnav{margin-top:0}
  #titleCard .bnav .pos{display:none}}` : ''}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const withG = href => { const u = new URL(href, location.href); u.searchParams.set('g', g); return u.pathname.split('/').pop() + u.search + u.hash; };

  fetch('data/units.json').then(r => r.json()).then(U => {
    const card = document.getElementById('titleCard'); if (!card) return;
    const list = (U.grades[g] || U.grades['3']).pages;
    const id = Object.keys(U.pages).find(k => U.pages[k].file === file);
    const i = list.indexOf(id);
    const nav = document.createElement('div'); nav.className = 'bnav';
    const a = (txt, href, cls, title) => { const e = document.createElement('a'); e.textContent = txt; e.href = href; if (cls) e.className = cls; if (title) e.title = title; nav.appendChild(e); return e; };
    a('⌂ 入口', withG('index.html'), '', '回到入口頁');
    if (i > 0) a('‹ 上一站', withG(U.pages[list[i - 1]].file), '', '上一站：' + U.pages[list[i - 1]].name);
    if (i >= 0) { const s = document.createElement('span'); s.className = 'pos'; s.textContent = `第 ${i + 1} 站／共 ${list.length} 站`; nav.appendChild(s); }
    if (i >= 0 && i < list.length - 1) a('下一站 ›', withG(U.pages[list[i + 1]].file), 'next', '下一站：' + U.pages[list[i + 1]].name);
    let inFrame = false; try { inFrame = window.self !== window.top; } catch (e) { inFrame = true; }
    if (inFrame) { const f = a('⤢ 全螢幕', location.href, 'fs', '開新分頁全螢幕'); f.target = '_blank'; f.rel = 'noopener'; }
    card.appendChild(nav);
  }).catch(() => { });
  // 頁內其他頁面連結（含說明卡裡後來才產生的）點下去時帶上年級
  document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('a[href]'); if (!el) return;
    const h = el.getAttribute('href');
    if (/^[a-z_]+\.html(\?|#|$)/.test(h)) el.setAttribute('href', withG(h));
  }, true);
})();
