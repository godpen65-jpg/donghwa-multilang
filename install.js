/* 홈 화면 추가 버튼 (2026-10-13, 2026-10-26 고침)
   - 크롬이 자동으로 띄우는 설치 팝업(아래쪽 배너)은 막는다
   - 대신 화면 구석에 이 앱 아이콘 + 작은 설명을 보여준다
     (페이지에 #hs-slot 자리가 있으면 거기에 붙는다. 예: 그리스신화 = 오른쪽 위)
   - 버튼, 링크, 입력칸을 가리지 않는 구석을 고르고, 맨 아래 내용이 버튼 밑에 깔리지 않게 아래 여백을 준다
   - 작은 ✕를 누르면 이 앱에서는 7일 동안 안 보인다
   - 아이폰·아이패드는 누르면 '공유 → 홈 화면에 추가' 안내를 띄운다
   - 설치할 수 있을 때만 보이고, 이미 설치했거나 앱으로 열었으면 안 보인다
   - 단, 설치한 다른 앱(예: 엄마표놀이터) 안에서 이 앱을 열었으면 '이 앱만 따로 홈 화면에 추가' 버튼을 띄운다.
     누르면 크롬에서 이 페이지가 열리고(?hs-install=1), 거기서 바로 설치 버튼이 뜬다
   ※ 모든 앱이 같은 파일을 쓴다. 고치면 mom-apps 안 앱 폴더들 + 다른 저장소 앱들에 똑같이 복사 */
(function () {
  var saved = null;
  // 앱으로 설치해서 열었을 때: 갤럭시탭 아래 작업표시줄이 화면 아래를 덮으므로
  // 페이지 아래에 여백을 줘서 버튼이 작업표시줄 위로 올라오게 한다
  var st = document.createElement('style');
  st.textContent = '@media (display-mode: standalone){' +
    'body{box-sizing:border-box;padding-bottom:calc(84px + env(safe-area-inset-bottom)) !important}}';
  (document.head || document.documentElement).appendChild(st);
  // 이 앱의 폴더 (manifest.json이 있는 곳)
  var ml = document.querySelector('link[rel="manifest"]');
  var myDir = ml ? new URL('.', ml.href).pathname : location.pathname.replace(/[^\/]*$/, '');
  var inOtherApp = false;          // 설치한 다른 앱의 창 안에서 열렸나
  if ((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone) {
    // 화면 아래에 붙어 떠 있는 버튼(사용법 등)도 작업표시줄 위로 올리기
    var lift = function () {
      var all = document.body.getElementsByTagName('*');
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (el.dataset.hsLifted || el.id === 'hs-add') continue;
        var cs = getComputedStyle(el);
        if (cs.position !== 'fixed') continue;
        var r = el.getBoundingClientRect();
        if (!r.height || r.height > window.innerHeight * 0.5) continue;   // 전체 화면 덮개는 그대로
        if (window.innerHeight - r.bottom > 40) continue;                  // 아래에 붙은 것만
        el.style.bottom = 'calc(' + cs.bottom + ' + 84px)';
        el.dataset.hsLifted = '1';
      }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lift); else lift();
    window.addEventListener('load', lift);
    setTimeout(lift, 1000);
    // 이 창을 처음 연 앱 기억하기. 다른 앱 폴더에서 넘어왔으면 '따로 설치' 버튼
    try {
      var first = sessionStorage.getItem('hs-launch');
      if (!first) {
        var ref = document.referrer ? new URL(document.referrer) : null;
        first = (ref && ref.host === location.host) ? ref.pathname.replace(/[^\/]*$/, '') : myDir;
        sessionStorage.setItem('hs-launch', first);
      }
      inOtherApp = first !== myDir;
    } catch (e) {}
    if (!inOtherApp) return;
  }
  // '따로 설치'를 눌러 크롬에서 열렸을 때: 크롬 설치 팝업이 아직 준비 안 됐어도 버튼을 바로 보여준다
  var fromApp = /[?&]hs-install=1/.test(location.search);
  if (fromApp) try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}

  // ✕로 닫았으면 7일 동안 안 보이기 (앱마다 따로)
  var HIDE_KEY = 'hs-hide:' + location.pathname.replace(/index\.html$/, '');
  try { if (+localStorage.getItem(HIDE_KEY) > Date.now()) return; } catch (e) {}

  // 아이폰·아이패드(사파리·크롬 모두)는 설치 팝업이 없어서, 버튼을 누르면 '공유 → 홈 화면에 추가' 안내를 띄운다
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();            // 자동 팝업 막기
    saved = e;
    show();
  });
  window.addEventListener('appinstalled', hide);

  var box, padded = null;
  function show() {
    if (box || !document.body) { if (!document.body) document.addEventListener('DOMContentLoaded', show); return; }
    var css = document.createElement('style');
    css.textContent =
      '#hs-add{position:fixed;right:12px;bottom:12px;z-index:9999;font-family:inherit}' +
      '#hs-add .hs-go{display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:none;padding:0;' +
      'cursor:pointer;-webkit-tap-highlight-color:transparent;font-family:inherit}' +
      '#hs-add img{width:48px;height:48px;border-radius:14px;box-shadow:0 3px 10px rgba(0,0,0,.18)}' +
      '#hs-add .hs-go span{font-size:10.5px;line-height:1.25;color:#7a6a80;background:rgba(255,255,255,.88);' +
      'padding:2px 6px;border-radius:8px;text-align:center;white-space:nowrap}' +
      '#hs-add.hs-mini .hs-go span{display:none}' +
      '#hs-add .hs-x{position:absolute;top:-7px;right:-7px;width:22px;height:22px;border-radius:50%;border:none;padding:0;' +
      'background:#fff;color:#9a8aa0;font-size:12px;line-height:22px;text-align:center;cursor:pointer;' +
      'box-shadow:0 1px 4px rgba(0,0,0,.2);font-family:inherit}' +
      '#hs-add.hs-mini .hs-x{top:-9px;right:-9px}' +
      '#hs-guide b{color:#7a63b0}';
    document.head.appendChild(css);
    box = document.createElement('div');
    box.id = 'hs-add';
    box.innerHTML = '<button type="button" class="hs-go" aria-label="홈 화면에 추가">' +
      '<img src="icon-192.png" alt=""><span>' + (inOtherApp ? '이 앱만 따로<br>홈 화면에 추가' : '홈 화면에 추가<br>앱처럼 열려요') +
      '</span></button>' +
      '<button type="button" class="hs-x" aria-label="홈 화면 추가 버튼 닫기">✕</button>';
    box.firstChild.onclick = function () {
      if (inOtherApp) return openInBrowser();
      if (!saved) {
        if (isIOS) guide('① 화면 아래(또는 주소창 옆) <b>공유 버튼 □↑</b>을 누르고<br>② <b>홈 화면에 추가</b>를 누르세요<br>' +
          '<span style="font-size:14px;color:#9a92a8">크롬이면 주소창 오른쪽 공유 버튼이에요</span>');
        else guide('크롬 오른쪽 위 <b>⋮</b> 를 누르고<br><b>홈 화면에 추가</b> (또는 <b>앱 설치</b>)를 누르세요');
        return;
      }
      saved.prompt();
      saved.userChoice.then(function (r) { if (r.outcome === 'accepted') hide(); saved = null; });
    };
    box.lastChild.onclick = function () {
      try { localStorage.setItem(HIDE_KEY, String(Date.now() + 7 * 864e5)); } catch (e) {}
      hide();
    };
    var slot = document.getElementById('hs-slot');
    if (slot) {                    // 페이지가 자리를 정해 두었으면 거기에 (떠다니지 않음)
      box.style.position = 'relative';
      slot.appendChild(box);
      return;
    }
    document.body.appendChild(box);
    place();
    window.addEventListener('resize', place);
    setTimeout(place, 800);        // 늦게 생기는 버튼까지 보고 다시 자리 잡기
  }

  // 구석 후보: 오른쪽 아래, 왼쪽 아래, 오른쪽 위, 왼쪽 위 (위는 머리줄 아래·맨 위 두 가지)
  // 앱 창 안이면 아래는 갤럭시탭 작업표시줄 위로
  var BOT = inOtherApp ? '96px' : '12px';
  var SPOTS = [
    { right: '12px', bottom: BOT },
    { left: '12px', bottom: BOT },
    { right: '12px', top: '70px' },
    { left: '12px', top: '70px' },
    { right: '12px', top: '10px' },
    { left: '12px', top: '10px' }
  ];
  var TAP = /^(A|BUTTON|INPUT|SELECT|TEXTAREA|LABEL|VIDEO|CANVAS|IFRAME)$/;
  // 피해야 할 것들의 자리. 1 = 떠 있는 버튼(사용법 등)만, 2 = + 누르는 것(버튼·링크·입력칸), 3 = + 글씨
  function obstacles(level) {
    var out = [], rng = document.createRange();
    var all = document.body.getElementsByTagName('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el === box || box.contains(el)) continue;
      var cs = getComputedStyle(el);
      var floating = cs.position === 'fixed' || cs.position === 'sticky';
      var tap = level >= 2 && (TAP.test(el.tagName) || el.onclick);
      if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      if (level >= 3) for (var c = el.firstChild; c; c = c.nextSibling) {
        if (c.nodeType !== 3 || !c.nodeValue.trim()) continue;
        rng.selectNodeContents(c);            // 글씨가 실제로 차지한 자리만 (줄 전체 말고)
        var rs = rng.getClientRects();
        for (var q = 0; q < rs.length; q++) if (rs[q].width && rs[q].bottom > 0 && rs[q].top < window.innerHeight) out.push(rs[q]);
      }
      if (!floating && !tap) continue;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > window.innerHeight) continue;
      if (floating && r.width >= window.innerWidth * 0.9) continue;   // 화면 꽉 찬 머리줄·덮개는 빼기
      if (!floating && r.width >= window.innerWidth * 0.8 && r.height >= window.innerHeight * 0.5) continue; // 큰 판(캔버스 등)
      out.push(r);
    }
    return out;
  }
  function setSpot(s, mini) {
    box.className = mini ? 'hs-mini' : '';
    box.style.left = box.style.right = box.style.top = box.style.bottom = 'auto';
    for (var k in SPOTS[s]) box.style[k] = SPOTS[s][k];
  }
  // 버튼이 list와 겹치는 넓이 (여유 6px)
  function hits(list) {
    var b = box.getBoundingClientRect(), n = 0;
    for (var j = 0; j < list.length; j++) {
      var f = list[j];
      var w = Math.min(b.right, f.right + 6) - Math.max(b.left, f.left - 6);
      var h = Math.min(b.bottom, f.bottom + 6) - Math.max(b.top, f.top - 6);
      if (w > 0 && h > 0) n += w * h;
    }
    return n;
  }
  function tryAll(list, from, to, mini) {
    for (var s = from; s < to; s++) { setSpot(s, mini); if (!hits(list)) return true; }
    return false;
  }
  function place() {
    if (!box) return;
    box.style.opacity = '';
    pad(true);
    var taps = obstacles(2);
    if (tryAll(taps, 0, 2) || tryAll(taps, 0, 2, true)) return pad();   // 1) 아래 구석, 버튼·링크 안 가리는 곳
    // 2) 스크롤되는 페이지: 내용이 버튼 밑으로 지나가니 아래 구석 + 아래 여백 (떠 있는 버튼만 피하기)
    if (document.documentElement.scrollHeight > window.innerHeight + 40 && tryAll(obstacles(1), 0, 2)) return pad();
    // 3) 한 화면짜리 앱(랭콘 바다·표범, 중국어 등): 글씨·버튼 없는 구석, 없으면 작게 해서 제일 덜 가리는 구석
    var busy = obstacles(3);
    if (tryAll(busy, 0, SPOTS.length)) return pad();
    // 화면 높이에 맞춰 줄어드는 앱은 아래 여백을 주면 아래 구석이 비기도 함
    setSpot(0, true); pad();
    if (tryAll(obstacles(2), 0, 2, true)) return pad();
    pad(true);
    if (tryAll(busy, 0, SPOTS.length, true)) return pad();
    var best = 0, bestScore = 1e9;
    for (var s = 0; s < SPOTS.length; s++) {
      setSpot(s, true);
      var score = hits(taps) * 10 + hits(busy);   // 누르는 것을 가리는 게 글씨보다 훨씬 나쁨
      if (score < bestScore) { best = s; bestScore = score; }
    }
    setSpot(best, true);
    box.style.opacity = '.85';
    pad();
  }
  // 아래 구석에 있으면, 페이지 맨 아래 내용이 버튼 밑에 깔리지 않게 아래 여백 주기
  function pad(reset) {
    var bs = document.body.style;
    if (padded === null) padded = [bs.getPropertyValue('padding-bottom'), bs.getPropertyPriority('padding-bottom')];
    bs.setProperty('padding-bottom', padded[0], padded[1]);
    if (reset || box.style.bottom === 'auto') return;
    var need = box.offsetHeight + parseFloat(box.style.bottom) + 12;
    if (parseFloat(getComputedStyle(document.body).paddingBottom) < need) bs.setProperty('padding-bottom', need + 'px', 'important');
  }
  function hide() {
    if (!box) return;
    box.remove(); box = null;
    if (padded !== null) document.body.style.setProperty('padding-bottom', padded[0], padded[1]);
  }
  // 앱 창 밖(크롬·사파리)에서 이 페이지 열기
  function openInBrowser() {
    var url = location.origin + location.pathname + '?hs-install=1';
    if (isIOS) {
      guide('<b>사파리</b>에서 아래 주소를 열고<br>공유 버튼 □↑ → <b>홈 화면에 추가</b>를 누르세요<br>' +
        '<span style="font-size:14px;color:#9a92a8;word-break:break-all">' + location.origin + location.pathname + '</span>');
      return;
    }
    // 안드로이드: 크롬으로 열기 (크롬이 없으면 그냥 주소 열기)
    location.href = 'intent://' + location.host + location.pathname + '?hs-install=1#Intent;scheme=https;' +
      'package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(url) + ';end';
  }
  function guide(html) {
    if (document.getElementById('hs-guide')) return;
    var g = document.createElement('div');
    g.id = 'hs-guide';
    g.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(40,30,60,.45);display:flex;' +
      'align-items:flex-end;justify-content:center;padding:16px';
    g.innerHTML = '<div style="background:#fff;border-radius:20px;padding:18px 20px;max-width:360px;width:100%;' +
      'font-size:16px;line-height:1.6;color:#4a4458;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.2)">' +
      '<div style="font-size:18px;font-weight:bold;margin-bottom:8px">홈 화면에 추가하기</div>' + html +
      '<div style="margin-top:12px;font-size:15px;color:#7a63b0">닫기</div></div>';
    g.onclick = function () { g.remove(); };
    document.body.appendChild(g);
  }

  if (isIOS || inOtherApp || fromApp) show();   // 위의 값들(SPOTS 등)이 다 준비된 뒤에 부르기
})();
