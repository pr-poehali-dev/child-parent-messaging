"""
Авторизация по номеру телефона через SMS-код (OTP).
Методы: POST /send-otp, POST /verify-otp, POST /register, GET /me, POST /logout
"""
import json
import os
import random
import secrets
import string
import urllib.request
import urllib.parse
import psycopg2
from datetime import datetime, timedelta


def get_db():
    return psycopg2.connect(os.environ["DATABASE_URL"])


SCHEMA = "t_p9816260_child_parent_messagi"


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token, X-Session-Id",
        "Content-Type": "application/json",
    }


def ok(data):
    return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps(data, default=str)}


def err(msg, code=400):
    return {"statusCode": code, "headers": cors_headers(), "body": json.dumps({"error": msg})}


def send_sms(phone: str, code: str):
    api_key = os.environ.get("SMS_API_KEY", "")
    if not api_key:
        print(f"[DEV] OTP for {phone}: {code}")
        return True
    clean_phone = phone.replace("+", "").replace(" ", "").replace("-", "")
    msg = f"Ваш код входа в СемьяЧат: {code}"
    params = urllib.parse.urlencode({"api_id": api_key, "to": clean_phone, "msg": msg, "json": 1})
    url = f"https://sms.ru/sms/send?{params}"
    req = urllib.request.urlopen(url, timeout=10)
    resp = json.loads(req.read())
    return resp.get("status") == "OK"


def get_user_by_token(conn, token: str):
    with conn.cursor() as cur:
        cur.execute(
            f"""SELECT u.* FROM {SCHEMA}.sessions s
                JOIN {SCHEMA}.users u ON u.id = s.user_id
                WHERE s.token = %s AND s.expires_at > NOW()""",
            (token,)
        )
        row = cur.fetchone()
        if not row:
            return None
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, row))


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers(), "body": ""}

    path = event.get("path", "/")
    method = event.get("httpMethod", "GET")
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    token = event.get("headers", {}).get("X-Auth-Token") or event.get("headers", {}).get("x-auth-token")

    conn = get_db()

    try:
        # POST /send-otp — отправить SMS с кодом
        if path.endswith("/send-otp") and method == "POST":
            phone = body.get("phone", "").strip()
            if not phone:
                return err("Укажите номер телефона")

            code = "".join(random.choices(string.digits, k=6))
            expires_at = datetime.now() + timedelta(minutes=10)

            with conn.cursor() as cur:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.otp_codes (phone, code, expires_at) VALUES (%s, %s, %s)",
                    (phone, code, expires_at)
                )
            conn.commit()

            send_sms(phone, code)

            with conn.cursor() as cur:
                cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = %s", (phone,))
                user = cur.fetchone()

            return ok({"sent": True, "exists": user is not None})

        # POST /verify-otp — проверить код и войти/продолжить регистрацию
        if path.endswith("/verify-otp") and method == "POST":
            phone = body.get("phone", "").strip()
            code = body.get("code", "").strip()
            if not phone or not code:
                return err("Укажите телефон и код")

            with conn.cursor() as cur:
                cur.execute(
                    f"""SELECT id FROM {SCHEMA}.otp_codes
                        WHERE phone = %s AND code = %s AND used = FALSE AND expires_at > NOW()
                        ORDER BY created_at DESC LIMIT 1""",
                    (phone, code)
                )
                otp = cur.fetchone()

            if not otp:
                return err("Неверный или устаревший код")

            with conn.cursor() as cur:
                cur.execute(f"UPDATE {SCHEMA}.otp_codes SET used = TRUE WHERE id = %s", (otp[0],))

            with conn.cursor() as cur:
                cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = %s", (phone,))
                user = cur.fetchone()

            if not user:
                conn.commit()
                return ok({"verified": True, "registered": False})

            session_token = secrets.token_hex(32)
            with conn.cursor() as cur:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.sessions (user_id, token) VALUES (%s, %s)",
                    (user[0], session_token)
                )
            conn.commit()

            return ok({"verified": True, "registered": True, "token": session_token, "user_id": user[0]})

        # POST /register — регистрация нового пользователя (родителя)
        if path.endswith("/register") and method == "POST":
            phone = body.get("phone", "").strip()
            name = body.get("name", "").strip()
            avatar = body.get("avatar", "👩")

            if not phone or not name:
                return err("Укажите имя и телефон")

            with conn.cursor() as cur:
                cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = %s", (phone,))
                if cur.fetchone():
                    return err("Пользователь с таким номером уже существует")

            with conn.cursor() as cur:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.families (name) VALUES (%s) RETURNING id",
                    (f"Семья {name}",)
                )
                family_id = cur.fetchone()[0]

            with conn.cursor() as cur:
                cur.execute(
                    f"""INSERT INTO {SCHEMA}.users (family_id, phone, name, role, avatar)
                        VALUES (%s, %s, %s, 'parent', %s) RETURNING id""",
                    (family_id, phone, name, avatar)
                )
                user_id = cur.fetchone()[0]

            session_token = secrets.token_hex(32)
            with conn.cursor() as cur:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.sessions (user_id, token) VALUES (%s, %s)",
                    (user_id, session_token)
                )
            conn.commit()

            return ok({"token": session_token, "user_id": user_id, "family_id": family_id})

        # GET /me — получить текущего пользователя
        if path.endswith("/me") and method == "GET":
            if not token:
                return err("Не авторизован", 401)
            user = get_user_by_token(conn, token)
            if not user:
                return err("Сессия истекла", 401)
            return ok({"user": user})

        # POST /logout — выйти
        if path.endswith("/logout") and method == "POST":
            if token:
                with conn.cursor() as cur:
                    cur.execute(f"DELETE FROM {SCHEMA}.sessions WHERE token = %s", (token,))
                conn.commit()
            return ok({"ok": True})

        return err("Маршрут не найден", 404)

    finally:
        conn.close()
