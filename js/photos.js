/* 實地照片（教師自攝，2026-11-18）：各頁說明卡共用。
   ph('134105', '說明')            一張大圖＋說明
   ph2(ph(...), ph(...))           兩張並排
   phg([['134105', '說明'], ...])  相簿：小圖排成格子，點了放大，可以左右切換
   PHCREDIT                        卡片最後的出處行
   圖檔：assets/photos/p<時間>.jpg、縮圖 assets/photos/t/p<時間>.jpg（由 tools/prep_photos.py 產生；對照見 實地照片_對照表.md） */
(() => {
  const st = document.createElement('style');
  st.textContent = `
.ph{margin:10px 0 4px}
.ph button,.phg button{display:block;width:100%;padding:0;border:0;background:none;cursor:zoom-in;border-radius:10px;overflow:hidden}
.ph img{display:block;width:100%;height:auto;max-height:440px;object-fit:contain;border-radius:10px;background:rgba(100,116,139,.15)}
.ph figcaption{font-size:13.5px;line-height:1.6;color:#334155;margin-top:5px}
.ph2{display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:start}
.ph2 .ph{margin:0}
.phg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0 4px}
.phg img{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:8px;background:rgba(100,116,139,.15)}
.phgt{font-size:13px;font-weight:800;color:#475569;margin:12px 0 0}
.phcredit{font-size:12px !important;color:#64748b;margin:6px 0 0 !important}
#lightbox{position:fixed;inset:0;z-index:60;background:rgba(8,16,24,.94);display:none;place-items:center;padding:14px 56px}
#lightbox.open{display:grid}
#lightbox img{display:block;max-width:100%;max-height:calc(100vh - 110px);border-radius:8px;margin:0 auto}
#lightbox p{color:#fff;font-size:15.5px;line-height:1.6;margin:10px 0 0;text-align:center}
#lightbox .n{color:#94a3b8;font-size:12.5px;margin-top:2px}
#lightbox button{position:fixed;top:50%;transform:translateY(-50%);width:46px;height:64px;border:0;border-radius:12px;background:rgba(255,255,255,.14);color:#fff;font-size:30px;font-weight:900;cursor:pointer}
#lightbox button:hover{background:rgba(255,255,255,.28)}
#lightbox .pv{left:6px} #lightbox .nx{right:6px}
#lightbox .cl{top:8px;right:8px;transform:none;width:44px;height:44px;font-size:24px}`;
  document.head.appendChild(st);

  const file = n => 'assets/photos/p' + n + '.jpg', thumb = n => 'assets/photos/t/p' + n + '.jpg';
  window.ph = (n, cap) => `<figure class="ph"><button type="button" data-ph="${n}" data-cap="${cap}"><img src="${file(n)}" alt="${cap}" loading="lazy"></button><figcaption>${cap}</figcaption></figure>`;
  window.ph2 = (a, b) => `<div class="ph2">${a}${b}</div>`;
  window.phg = (list, title) => (title ? `<p class="phgt">${title}</p>` : '') + `<div class="phg">${list.map(([n, cap]) => `<button type="button" data-ph="${n}" data-cap="${cap}" title="${cap}"><img src="${thumb(n)}" alt="${cap}" loading="lazy"></button>`).join('')}</div>`;
  // phset('split')：清單第一張放大圖、其餘排成相簿；phset('split', '標題') 則全部排成相簿並加小標題
  window.phset = (key, title) => { const L = (window.PHOTOS || {})[key] || []; if (!L.length) return ''; return title ? window.phg(L, title) : window.ph(L[0][0], L[0][1]) + (L.length > 1 ? window.phg(L.slice(1), '更多照片（' + (L.length - 1) + ' 張）') : ''); };
  window.PHCREDIT = '<p class="phcredit">照片：教師自攝，2026 年 11 月 18 日。點照片可以放大、左右切換。</p>';

  let lb, set = [], at = 0;
  const show = i => {
    at = (i + set.length) % set.length; const b = set[at];
    lb.querySelector('img').src = file(b.dataset.ph); lb.querySelector('.c').textContent = b.dataset.cap;
    lb.querySelector('.n').textContent = set.length > 1 ? `${at + 1} / ${set.length}` : '';
    lb.querySelector('.pv').hidden = lb.querySelector('.nx').hidden = set.length < 2;
  };
  const close = () => lb && lb.classList.remove('open');
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-ph]'); if (!b) return;
    if (!lb) {
      lb = document.createElement('div'); lb.id = 'lightbox';
      lb.innerHTML = '<div><img alt=""><p class="c"></p><p class="n"></p></div><button class="pv" aria-label="上一張">‹</button><button class="nx" aria-label="下一張">›</button><button class="cl" aria-label="關閉">×</button>';
      lb.addEventListener('click', ev => { if (ev.target.classList.contains('pv')) show(at - 1); else if (ev.target.classList.contains('nx')) show(at + 1); else close(); });
      let sx = null; lb.addEventListener('touchstart', ev => { sx = ev.touches[0].clientX; }, { passive: true });
      lb.addEventListener('touchend', ev => { if (sx === null) return; const dx = ev.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50) { show(at + (dx < 0 ? 1 : -1)); ev.preventDefault(); } });
      document.body.appendChild(lb);
    }
    const root = b.closest('#panel, #pBody, .panel') || document; set = [...root.querySelectorAll('[data-ph]')];
    lb.classList.add('open'); show(Math.max(0, set.indexOf(b)));
  });
  document.addEventListener('keydown', e => { if (!lb || !lb.classList.contains('open')) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(at - 1); if (e.key === 'ArrowRight') show(at + 1); });
})();
