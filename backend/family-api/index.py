"""
Управление семьёй: участники, приглашения, ограничения.
GET /members — список членов семьи
POST /invite — пригласить участника (только родитель)
PUT /member/:id — обновить участника (имя, аватар, ограничения)
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

        # GET /members — все участники семьи
        if path.endswith("/members") and method == "GET":
            with conn.cursor() as cur:
                cur.execute(
                    f"""SELECT id, name, phone, role, avatar, age, is_restricted, created_at
                        FROM {SCHEMA}.users WHERE family_id = %s ORDER BY role DESC, id""",
                    (user["family_id"],)
                )
                cols = [d[0] for d in cur.description]
                members = [dict(zip(cols, row)) for row in cur.fetchall()]
            return ok({"members": members})

        # POST /invite — пригласить участника
        if path.endswith("/invite") and method == "POST":
            if user["role"] != "parent":
                return err("Только родитель может приглашать участников", 403)

            phone = body.get("phone", "").strip()
            name = body.get("name", "").strip()
            role = body.get("role", "child")
            avatar = body.get("avatar", "👤")
            age = body.get("age")

            if not phone or not name:
                return err("Укажите имя и номер телефона")
            if role not in ("parent", "child"):
                return err("Роль должна быть parent или child")

            with conn.cursor() as cur:
                cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = %s", (phone,))
                existing = cur.fetchone()

            if existing:
                with conn.cursor() as cur:
                    cur.execute(
                        f"UPDATE {SCHEMA}.users SET family_id = %s WHERE id = %s",
                        (user["family_id"], existing[0])
                    )
                conn.commit()
                return ok({"invited": True, "user_id": existing[0], "already_existed": True})

            with conn.cursor() as cur:
                cur.execute(
                    f"""INSERT INTO {SCHEMA}.users (family_id, phone, name, role, avatar, age)
                        VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
                    (user["family_id"], phone, name, role, avatar, age)
                )
                new_id = cur.fetchone()[0]
            conn.commit()
            return ok({"invited": True, "user_id": new_id, "already_existed": False})

        # PUT /member/<id> — обновить участника
        if "/member/" in path and method == "PUT":
            if user["role"] != "parent":
                return err("Только родитель может изменять участников", 403)
            member_id = int(path.split("/member/")[-1])
            fields = {}
            if "name" in body:
                fields["name"] = body["name"]
            if "avatar" in body:
                fields["avatar"] = body["avatar"]
            if "is_restricted" in body:
                fields["is_restricted"] = body["is_restricted"]
            if "age" in body:
                fields["age"] = body["age"]

            if not fields:
                return err("Нет данных для обновления")

            set_clause = ", ".join(f"{k} = %s" for k in fields)
            values = list(fields.values()) + [member_id, user["family_id"]]

            with conn.cursor() as cur:
                cur.execute(
                    f"UPDATE {SCHEMA}.users SET {set_clause} WHERE id = %s AND family_id = %s",
                    values
                )
            conn.commit()
            return ok({"updated": True})

        return err("Маршрут не найден", 404)

    finally:
        conn.close()
