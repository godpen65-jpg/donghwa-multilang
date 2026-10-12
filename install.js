/* 홈 화면 추가 버튼 (2026-10-13)
   - 크롬이 자동으로 띄우는 설치 팝업(아래쪽 배너)은 막는다
   - 대신 오른쪽 아래에 이 앱 아이콘 + 작은 설명을 보여준다
   - 설치할 수 있을 때만 보이고, 이미 설치했거나 앱으로 열었으면 안 보인다 */
(function () {
  var saved = null;
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();            // 자동 팝업 막기
    saved = e;
    show();
  });
  window.addEventListener('appinstalled', hide);

  var box;
  function show() {
    if (box || !document.body) { if (!document.body) document.addEventListener('DOMContentLoaded', show); return; }
    var css = document.createElement('style');
    css.textContent =
      '#hs-add{position:fixed;right:12px;bottom:12px;z-index:9999;display:flex;flex-direction:column;align-items:center;' +
      'gap:3px;background:none;border:none;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;font-family:inherit}' +
      '#hs-add img{width:48px;height:48px;border-radius:14px;box-shadow:0 3px 10px rgba(0,0,0,.18)}' +
      '#hs-add span{font-size:10.5px;line-height:1.25;color:#7a6a80;background:rgba(255,255,255,.88);' +
      'padding:2px 6px;border-radius:8px;text-align:center;white-space:nowrap}';
    document.head.appendChild(css);
    box = document.createElement('button');
    box.id = 'hs-add';
    box.type = 'button';
    box.setAttribute('aria-label', '홈 화면에 추가');
    box.innerHTML = '<img src="icon-192.png" alt=""><span>홈 화면에 추가<br>앱처럼 열려요</span>';
    box.onclick = function () {
      if (!saved) return;
      saved.prompt();
      saved.userChoice.then(function (r) { if (r.outcome === 'accepted') hide(); saved = null; });
    };
    document.body.appendChild(box);
    place();
    window.addEventListener('resize', place);
    setTimeout(place, 800);        // 늦게 생기는 버튼까지 보고 다시 자리 잡기
  }

  // 페이지에 원래 떠 있는 버튼(사용법 등)과 안 겹치는 구석 찾기
  var SPOTS = [
    { right: '12px', bottom: '12px' },
    { left: '12px', bottom: '12px' },
    { right: '12px', top: '70px' },
    { left: '12px', top: '70px' }
  ];
  function place() {
    if (!box) return;
    var floats = [];
    var all = document.body.getElementsByTagName('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el === box || box.contains(el)) continue;
      var pos = getComputedStyle(el).position;
      if (pos !== 'fixed' && pos !== 'sticky') continue;
      var r = el.getBoundingClientRect();
      if (r.width && r.height && r.width < window.innerWidth * 0.9) floats.push(r);
    }
    for (var s = 0; s < SPOTS.length; s++) {
      box.style.left = box.style.right = box.style.top = box.style.bottom = 'auto';
      for (var k in SPOTS[s]) box.style[k] = SPOTS[s][k];
      var b = box.getBoundingClientRect(), hit = false;
      for (var j = 0; j < floats.length; j++) {
        var f = floats[j];
        if (b.left < f.right + 6 && b.right > f.left - 6 && b.top < f.bottom + 6 && b.bottom > f.top - 6) { hit = true; break; }
      }
      if (!hit) return;
    }
    box.style.left = box.style.top = 'auto';   // 다 차 있으면 오른쪽 아래, 대신 반투명
    box.style.right = box.style.bottom = '12px';
    box.style.opacity = '.75';
  }
  function hide() { if (box) { box.remove(); box = null; } }
})();
