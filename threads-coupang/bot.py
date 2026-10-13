"""스레드 + 쿠팡파트너스 자동 발행 봇.

사용법:
  python bot.py check                 # 토큰/계정 확인
  python bot.py token-exchange <단기토큰>  # 단기 토큰 → 60일 장기 토큰
  python bot.py token-refresh         # 장기 토큰 연장 (만료 전에 주기적으로)
  python bot.py generate [--per 3]    # products.csv 상품마다 글 초안 생성 → queue.json
  python bot.py schedule [--per-day 12 --start 8 --end 23]  # 초안에 발행 시각 배정
  python bot.py publish [--dry-run]   # 발행 시각이 지난 글을 올림 (cron으로 10분마다)
  python bot.py stats                 # 발행한 글 조회수·반응 수집
"""

import argparse
import csv
import json
import os
import random
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import requests
from dotenv import load_dotenv
from pydantic import BaseModel

BASE = Path(__file__).parent
QUEUE = BASE / "queue.json"
PRODUCTS = BASE / "products.csv"
GRAPH = "https://graph.threads.net/v1.0"

# 공정위 지침: 대가성 문구는 링크와 함께 눈에 띄게 표시
DISCLOSURE = "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다."
THREADS_TEXT_LIMIT = 500

load_dotenv(BASE / ".env")


# ---------- 공통 ----------

def env(name):
    value = os.getenv(name)
    if not value:
        sys.exit(f"[오류] .env 에 {name} 값이 없어요.")
    return value


def load_queue():
    return json.loads(QUEUE.read_text(encoding="utf-8")) if QUEUE.exists() else []


def save_queue(queue):
    QUEUE.write_text(json.dumps(queue, ensure_ascii=False, indent=2), encoding="utf-8")


def threads_call(method, path, **params):
    params["access_token"] = env("THREADS_ACCESS_TOKEN")
    url = path if path.startswith("http") else f"{GRAPH}/{path}"
    resp = requests.request(method, url, params=params, timeout=30)
    data = resp.json()
    if resp.status_code != 200 or "error" in data:
        raise RuntimeError(f"Threads API 오류: {data.get('error', data)}")
    return data


# ---------- 토큰 ----------

def cmd_check(_):
    me = threads_call("GET", "me", fields="id,username")
    print(f"계정: @{me['username']} (id {me['id']})")
    if os.getenv("THREADS_USER_ID") != me["id"]:
        print(f"→ .env 의 THREADS_USER_ID 를 {me['id']} 로 넣어주세요.")
    quota = threads_call("GET", f"{me['id']}/threads_publishing_limit",
                         fields="quota_usage,config")
    q = quota["data"][0]
    print(f"최근 24시간 발행: {q['quota_usage']} / {q['config']['quota_total']}")


def cmd_token_exchange(args):
    resp = requests.get("https://graph.threads.net/access_token", params={
        "grant_type": "th_exchange_token",
        "client_secret": env("THREADS_APP_SECRET"),
        "access_token": args.short_token,
    }, timeout=30).json()
    if "access_token" not in resp:
        sys.exit(f"[오류] {resp}")
    days = resp.get("expires_in", 0) // 86400
    print(f"장기 토큰 (약 {days}일 유효). .env 의 THREADS_ACCESS_TOKEN 에 넣으세요:\n")
    print(resp["access_token"])


def cmd_token_refresh(_):
    resp = requests.get("https://graph.threads.net/refresh_access_token", params={
        "grant_type": "th_refresh_token",
        "access_token": env("THREADS_ACCESS_TOKEN"),
    }, timeout=30).json()
    if "access_token" not in resp:
        sys.exit(f"[오류] {resp}")
    print("새 장기 토큰. .env 의 THREADS_ACCESS_TOKEN 을 교체하세요:\n")
    print(resp["access_token"])


# ---------- 글 생성 (Claude) ----------

class Post(BaseModel):
    angle: str  # 어떤 관점의 글인지 (예: 후기형, 문제해결형, 비교형)
    text: str


class Posts(BaseModel):
    posts: list[Post]


SYSTEM_PROMPT = """너는 한국어 스레드(Threads) 글을 쓰는 사람이다.
쿠팡에서 파는 상품 하나를 소개하는 짧은 글을 쓴다.

- 실제 사람이 일상에서 쓴 것처럼 자연스러운 반말/구어체. 광고 문구, 과장, 이모지 남발 금지.
- 첫 줄에서 공감되는 상황이나 문제를 던지고, 상품이 그걸 어떻게 해결하는지 짧게.
- 직접 써봤다고 지어내지 말 것. 사용 후기·별점·판매량 같은 사실을 만들어내지 말 것.
  메모에 있는 정보만 사실로 쓰고, 나머지는 "이런 사람한테 맞겠다" 수준으로.
- 가격을 숫자로 단정하지 말 것 (가격은 수시로 바뀜).
- 링크, 해시태그, 대가성 문구는 넣지 말 것 (프로그램이 따로 붙인다).
- 각 글은 300자 이내. 글마다 관점(angle)을 다르게."""


def generate_posts(client, product, count):
    response = client.beta.messages.parse(
        model="claude-opus-5-5",
        max_tokens=16000,
        output_config={"effort": "low"},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": f"상품명: {product['name']}\n메모: {product.get('memo', '')}\n\n"
                       f"서로 다른 관점의 글 {count}개를 써줘.",
        }],
        output_format=Posts,
    )
    if response.stop_reason == "refusal":
        print(f"  [건너뜀] 모델이 거절: {product['name']}")
        return []
    return response.parsed_output.posts


def cmd_generate(args):
    import anthropic

    client = anthropic.Anthropic(api_key=env("ANTHROPIC_API_KEY"))
    queue = load_queue()
    done_links = {item["link"] for item in queue}

    with open(PRODUCTS, encoding="utf-8-sig") as f:
        products = [p for p in csv.DictReader(f) if p.get("link")]

    added = 0
    for product in products:
        if product["link"] in done_links and not args.again:
            continue
        print(f"생성 중: {product['name']}")
        for post in generate_posts(client, product, args.per):
            queue.append({
                "id": f"{int(time.time() * 1000)}-{random.randint(100, 999)}",
                "product": product["name"],
                "link": product["link"],
                "angle": post.angle,
                "text": post.text.strip(),
                "scheduled_at": None,
                "posted_at": None,
                "post_id": None,
            })
            added += 1
        save_queue(queue)
    print(f"\n초안 {added}개 추가 → queue.json (발행 전에 열어서 확인·수정하세요)")


# ---------- 예약 ----------

def cmd_schedule(args):
    queue = load_queue()
    pending = [q for q in queue if not q["scheduled_at"] and not q["posted_at"]]
    if not pending:
        print("예약할 초안이 없어요.")
        return

    random.shuffle(pending)  # 같은 상품 글이 연달아 나가지 않게
    hours = args.end - args.start
    gap = hours * 60 / args.per_day  # 분 단위 간격

    taken = [datetime.fromisoformat(q["scheduled_at"]) for q in queue
             if q["scheduled_at"] and not q["posted_at"]]
    day = max(taken).date() + timedelta(days=1) if taken else datetime.now().date()
    slot = 0
    items = iter(pending)
    item = next(items)
    while item:
        if slot == args.per_day:
            day += timedelta(days=1)
            slot = 0
        minutes = args.start * 60 + slot * gap + random.uniform(0, gap * 0.6)
        when = datetime.combine(day, datetime.min.time()) + timedelta(minutes=minutes)
        slot += 1
        if when < datetime.now() + timedelta(minutes=5):
            continue  # 이미 지난 시간대는 건너뛰고 다음 칸으로
        item["scheduled_at"] = when.isoformat(timespec="minutes")
        item = next(items, None)

    save_queue(queue)
    print(f"{len(pending)}개 예약 완료. 하루 {args.per_day}개, {args.start}시~{args.end}시 사이.")


# ---------- 발행 ----------

def build_texts(item, mode):
    """본문과 (링크를 댓글로 다는 경우) 댓글 텍스트를 만든다. 둘 다 대가성 문구 포함."""
    if mode == "inline":
        main = f"{item['text']}\n\n{item['link']}\n\n{DISCLOSURE}"
        return main, None
    main = f"{item['text']}\n\n(링크는 댓글에 · 쿠팡파트너스 활동으로 수수료를 받을 수 있어요)"
    reply = f"{item['link']}\n\n{DISCLOSURE}"
    return main, reply


def publish_text(user_id, text, reply_to=None):
    params = {"media_type": "TEXT", "text": text}
    if reply_to:
        params["reply_to_id"] = reply_to
    container = threads_call("POST", f"{user_id}/threads", **params)
    for attempt in range(5):
        time.sleep(3 + attempt * 3)  # 컨테이너 처리 대기
        try:
            return threads_call("POST", f"{user_id}/threads_publish",
                                creation_id=container["id"])["id"]
        except RuntimeError as e:
            last = e
    raise last


def cmd_publish(args):
    user_id = env("THREADS_USER_ID")
    queue = load_queue()
    now = datetime.now()
    due = [q for q in queue if q["scheduled_at"] and not q["posted_at"]
           and datetime.fromisoformat(q["scheduled_at"]) <= now]

    for item in due:
        main, reply = build_texts(item, args.link_mode)
        if len(main) > THREADS_TEXT_LIMIT:
            print(f"[건너뜀] 500자 초과: {item['id']} ({len(main)}자) - queue.json에서 줄여주세요")
            continue
        if args.dry_run:
            print(f"--- {item['scheduled_at']} ---\n{main}\n[댓글] {reply}\n")
            continue
        try:
            post_id = publish_text(user_id, main)
            if reply:
                publish_text(user_id, reply, reply_to=post_id)
        except RuntimeError as e:
            print(f"[실패] {item['product']}: {e}")
            break  # 한도 초과·토큰 만료 등은 다음 실행 때 다시
        item["posted_at"] = datetime.now().isoformat(timespec="minutes")
        item["post_id"] = post_id
        save_queue(queue)
        print(f"발행: {item['product']} ({item['angle']})")

    if not due:
        print("지금 올릴 글이 없어요.")


# ---------- 통계 ----------

def cmd_stats(_):
    queue = load_queue()
    rows = []
    for item in queue:
        if not item.get("post_id"):
            continue
        try:
            data = threads_call("GET", f"{item['post_id']}/insights",
                                metric="views,likes,replies,reposts")["data"]
        except RuntimeError as e:
            print(f"[실패] {item['post_id']}: {e}")
            continue
        metrics = {m["name"]: m["values"][0]["value"] for m in data}
        item["stats"] = metrics
        rows.append((item, metrics))
    save_queue(queue)

    rows.sort(key=lambda r: r[1].get("views", 0), reverse=True)
    print(f"{'조회':>7} {'좋아요':>5} {'시각':<17} 상품 / 관점")
    for item, m in rows:
        print(f"{m.get('views', 0):>7} {m.get('likes', 0):>5} {item['posted_at']:<17} "
              f"{item['product']} / {item['angle']}")


def main():
    parser = argparse.ArgumentParser(description="스레드 쿠팡파트너스 봇")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("check").set_defaults(func=cmd_check)

    p = sub.add_parser("token-exchange")
    p.add_argument("short_token")
    p.set_defaults(func=cmd_token_exchange)

    sub.add_parser("token-refresh").set_defaults(func=cmd_token_refresh)

    p = sub.add_parser("generate")
    p.add_argument("--per", type=int, default=3, help="상품당 글 개수")
    p.add_argument("--again", action="store_true", help="이미 만든 상품도 다시 생성")
    p.set_defaults(func=cmd_generate)

    p = sub.add_parser("schedule")
    p.add_argument("--per-day", type=int, default=12)
    p.add_argument("--start", type=int, default=8, help="발행 시작 시(0-23)")
    p.add_argument("--end", type=int, default=23, help="발행 끝 시(1-24)")
    p.set_defaults(func=cmd_schedule)

    p = sub.add_parser("publish")
    p.add_argument("--dry-run", action="store_true", help="실제로 올리지 않고 미리보기")
    p.add_argument("--link-mode", choices=["reply", "inline"], default="reply",
                   help="reply: 링크를 댓글로 / inline: 본문에 링크")
    p.set_defaults(func=cmd_publish)

    sub.add_parser("stats").set_defaults(func=cmd_stats)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
