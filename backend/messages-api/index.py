"""
Сообщения между членами семьи.
GET /chats — список чатов с последними сообщениями
GET /chat/:userId — история переписки с пользователем
POST /send — отправить сообщение
POST /read/:userId — отметить сообщения как прочитанные
"""
import json
import os
import psycopg2


SCHEMA = "t_p9816260_child_parent_messagi"


def get_db():
    return psycopg2.connect(os.environ["DATABASE_URL"])


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
        if not token:
            return err("Не авторизован", 401)
        user = get_user_by_token(conn, token)
        if not user:
            return err("Сессия истекла", 401)

        uid = user["id"]
        fid = user["family_id"]

        # GET /chats — список чатов
        if path.endswith("/chats") and method == "GET":
            with conn.cursor() as cur:
                cur.execute(
                    f"""SELECT u.id, u.name, u.avatar, u.role, u.is_restricted,
                        (SELECT text FROM {SCHEMA}.messages m
                         WHERE (m.sender_id = u.id AND m.receiver_id = %s)
                            OR (m.sender_id = %s AND m.receiver_id = u.id)
                         ORDER BY m.created_at DESC LIMIT 1) AS last_message,
                        (SELECT created_at FROM {SCHEMA}.messages m
                         WHERE (m.sender_id = u.id AND m.receiver_id = %s)
                            OR (m.sender_id = %s AND m.receiver_id = u.id)
                         ORDER BY m.created_at DESC LIMIT 1) AS last_time,
                        (SELECT COUNT(*) FROM {SCHEMA}.messages m
                         WHERE m.sender_id = u.id AND m.receiver_id = %s AND m.is_read = FALSE) AS unread_count
                        FROM {SCHEMA}.users u
                        WHERE u.family_id = %s AND u.id != %s
                        ORDER BY last_time DESC NULLS LAST""",
                    (uid, uid, uid, uid, uid, fid, uid)
                )
                cols = [d[0] for d in cur.description]
                chats = [dict(zip(cols, row)) for row in cur.fetchall()]
            return ok({"chats": chats})

        # GET /chat/<userId> — история сообщений
        if "/chat/" in path and method == "GET":
            other_id = int(path.split("/chat/")[-1])
            with conn.cursor() as cur:
                cur.execute(
                    f"""SELECT id, sender_id, receiver_id, text, is_read, created_at
                        FROM {SCHEMA}.messages
                        WHERE (sender_id = %s AND receiver_id = %s)
                           OR (sender_id = %s AND receiver_id = %s)
                        ORDER BY created_at ASC LIMIT 100""",
                    (uid, other_id, other_id, uid)
                )
                cols = [d[0] for d in cur.description]
                msgs = [dict(zip(cols, row)) for row in cur.fetchall()]
            return ok({"messages": msgs})

        # POST /send — отправить сообщение
        if path.endswith("/send") and method == "POST":
            receiver_id = body.get("receiver_id")
            text = body.get("text", "").strip()
            if not receiver_id or not text:
                return err("Укажите получателя и текст")

            # Проверяем, что получатель из той же семьи
            with conn.cursor() as cur:
                cur.execute(
                    f"SELECT id FROM {SCHEMA}.users WHERE id = %s AND family_id = %s",
                    (receiver_id, fid)
                )
                if not cur.fetchone():
                    return err("Получатель не из вашей семьи", 403)

            with conn.cursor() as cur:
                cur.execute(
                    f"""INSERT INTO {SCHEMA}.messages (sender_id, receiver_id, text)
                        VALUES (%s, %s, %s) RETURNING id, created_at""",
                    (uid, receiver_id, text)
                )
                row = cur.fetchone()
            conn.commit()
            return ok({"id": row[0], "created_at": str(row[1])})

        # POST /read/<userId> — прочитать сообщения
        if "/read/" in path and method == "POST":
            other_id = int(path.split("/read/")[-1])
            with conn.cursor() as cur:
                cur.execute(
                    f"""UPDATE {SCHEMA}.messages SET is_read = TRUE
                        WHERE sender_id = %s AND receiver_id = %s AND is_read = FALSE""",
                    (other_id, uid)
                )
            conn.commit()
            return ok({"ok": True})

        return err("Маршрут не найден", 404)

    finally:
        conn.close()
