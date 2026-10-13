# 스레드 × 쿠팡파트너스 자동 발행

상품 링크를 넣으면 Claude가 스레드 글을 쓰고, 정해진 시간에 스레드 공식 API로 자동 발행합니다.
대가성 문구(공정위 지침)는 모든 글에 자동으로 붙습니다.

```
products.csv ──generate──▶ queue.json(초안) ──직접 확인·수정──▶ schedule ──▶ publish(10분마다) ──▶ stats
```

---

## 1. 스레드 API 준비 (한 번만)

메타 개발자 사이트에서 "앱"을 만들고, 내 스레드 계정을 그 앱에 연결해서 **토큰**을 받는 과정입니다.

### 1-1. 메타 개발자 계정
1. https://developers.facebook.com 접속 → 페이스북 계정으로 로그인
2. 처음이면 **시작하기** → 개발자 등록 (전화번호 인증)

### 1-2. 앱 만들기
1. 오른쪽 위 **내 앱 → 앱 만들기**
2. 앱 이름 입력 (아무거나, 예: `my-threads-bot`)
3. **사용 사례** 선택 화면에서 **"Threads API에 액세스"** 선택
4. 비즈니스 포트폴리오는 "지금은 연결 안 함"으로 진행해도 됩니다
5. 만들기 완료

### 1-3. 권한 켜기
앱 대시보드 → **사용 사례 → Threads API 액세스 → 사용자 지정(Customize)** → **권한**에서 아래를 추가합니다.
- `threads_basic` (기본)
- `threads_content_publish` (글 발행)
- `threads_manage_insights` (조회수 통계)
- `threads_manage_replies` (링크 댓글 달기)

같은 화면 **설정**에서 콜백 URL 3칸(리디렉션/삭제/제거)에 아무 https 주소나 넣어도 됩니다 (예: `https://localhost/`).

### 1-4. 내 스레드 계정을 테스터로 등록
1. 앱 대시보드 → **앱 역할 → 역할 → 사람 추가** → **Threads 테스터** 선택 → 내 스레드 아이디 입력
2. **스레드 앱**에서: 설정 → 계정 → **웹사이트 권한** → **초대** → 수락

> 앱 심사(App Review) 없이 **내 계정에만** 쓰는 건 이 테스터 등록으로 충분합니다.

### 1-5. 토큰 받기
1. **사용 사례 → Threads API 액세스 → 사용자 지정 → 설정** 화면 아래쪽 **"사용자 토큰 생성기"**에서 내 계정 옆 **액세스 토큰 생성** 클릭 → 단기 토큰(1시간짜리) 복사
2. 같은 화면(또는 **앱 설정 → 기본 설정**)에서 **Threads 앱 시크릿 코드** 복사
3. `.env` 파일에 시크릿을 넣고 장기 토큰(60일)으로 바꿉니다:

```bash
cp .env.example .env          # 그리고 THREADS_APP_SECRET 채우기
python bot.py token-exchange 단기토큰붙여넣기
```

4. 출력된 장기 토큰을 `.env` 의 `THREADS_ACCESS_TOKEN` 에 넣고:

```bash
python bot.py check           # 계정 id가 나오면 THREADS_USER_ID 에 넣기
```

> 장기 토큰은 60일이 지나면 만료됩니다. 한 달에 한 번 `python bot.py token-refresh` 로 연장하세요.

---

## 2. 설치

```bash
pip install -r requirements.txt
```

`.env` 에 `ANTHROPIC_API_KEY` 도 넣습니다 (https://console.anthropic.com → API Keys, 사용량만큼 요금 발생).

---

## 3. 사용

### 상품 등록 — `products.csv`
쿠팡파트너스에서 만든 링크를 한 줄씩 넣습니다. `memo` 에 쓴 내용만 글에서 "사실"로 쓰입니다.

```csv
name,link,memo
무선 미니 청소기,https://link.coupang.com/a/xxxx,"차량용, 무게 600g, 흡입력 강함"
```

### 글 초안 만들기
```bash
python bot.py generate --per 3      # 상품마다 관점이 다른 글 3개
```
→ `queue.json` 을 열어서 **꼭 읽어보고** 어색한 글은 고치거나 지우세요.

### 발행 시각 배정
```bash
python bot.py schedule --per-day 12 --start 8 --end 23
```
하루 12개를 8시~23시 사이에 조금씩 랜덤하게 흩뿌립니다.

### 발행
```bash
python bot.py publish --dry-run     # 미리보기
python bot.py publish               # 시간이 된 글 실제 발행
```
기본은 **본문 + 댓글에 링크** 방식입니다 (본문에 링크가 있으면 도달률이 떨어지는 경우가 많아서).
본문에 바로 넣으려면 `--link-mode inline`.

### 통계
```bash
python bot.py stats                 # 조회수 높은 순으로 정렬
```

---

## 4. 24시간 돌리기

`publish` 를 10분마다 실행하면 됩니다. 컴퓨터가 계속 켜져 있어야 하니 아래 중 하나:

- **켜둔 PC / 맥**: `crontab -e` 에 `*/10 * * * * cd /경로/threads-coupang && python bot.py publish >> publish.log 2>&1`
- **클라우드 서버** (오라클 프리티어, AWS 라이트세일 등): 위와 동일
- **GitHub Actions**: 필요하면 말씀하세요. 워크플로를 따로 만들어 드립니다.

---

## 주의

- **다계정 · 비공식 자동화 금지**: 메타 정책 위반으로 계정이 정지될 수 있습니다. 이 봇은 공식 API만 씁니다.
- **API 한도**: 계정당 24시간 250개. 그래도 하루 수십 개씩 비슷한 글을 올리면 도달률이 떨어지고 신고가 들어옵니다. 하루 10~20개로 시작해서 `stats` 를 보고 조절하세요.
- **대가성 문구**: 지우지 마세요. 빠지면 쿠팡파트너스 정산이 보류되거나 공정위 제재 대상이 될 수 있습니다.
- **글 내용**: 써보지 않은 상품을 써본 것처럼 쓰는 건 기만 광고입니다. 프롬프트에서 막아뒀지만 초안은 직접 확인하세요.
