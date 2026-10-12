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
  }
  function hide() { if (box) { box.remove(); box = null; } }
})();
