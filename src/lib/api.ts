const AUTH_URL = "https://functions.poehali.dev/6a59ced4-0475-4185-899d-046bd8250a26";
const FAMILY_URL = "https://functions.poehali.dev/ddf13056-c34d-4641-97ae-1a92e160eaea";
const MESSAGES_URL = "https://functions.poehali.dev/3cbb982c-9ac8-4793-9e21-155d8f15615d";

function getToken(): string | null {
  return localStorage.getItem("fc_token");
}

function setToken(token: string) {
  localStorage.setItem("fc_token", token);
}

function clearToken() {
  localStorage.removeItem("fc_token");
}

async function request(baseUrl: string, path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers["X-Auth-Token"] = token;

  const res = await fetch(`${baseUrl}/${path}`, { ...options, headers });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export const api = {
  getToken,
  setToken,
  clearToken,

  auth: {
    sendOtp: (phone: string) =>
      request(AUTH_URL, "send-otp", { method: "POST", body: JSON.stringify({ phone }) }),

    verifyOtp: (phone: string, code: string) =>
      request(AUTH_URL, "verify-otp", { method: "POST", body: JSON.stringify({ phone, code }) }),

    register: (phone: string, name: string, avatar: string) =>
      request(AUTH_URL, "register", { method: "POST", body: JSON.stringify({ phone, name, avatar }) }),

    me: () => request(AUTH_URL, "me"),

    logout: () => request(AUTH_URL, "logout", { method: "POST" }),
  },

  family: {
    members: () => request(FAMILY_URL, "members"),

    invite: (phone: string, name: string, role: string, avatar: string, age?: number) =>
      request(FAMILY_URL, "invite", {
        method: "POST",
        body: JSON.stringify({ phone, name, role, avatar, age }),
      }),

    updateMember: (id: number, data: Record<string, unknown>) =>
      request(FAMILY_URL, `member/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  messages: {
    chats: () => request(MESSAGES_URL, "chats"),

    history: (userId: number) => request(MESSAGES_URL, `chat/${userId}`),

    send: (receiverId: number, text: string) =>
      request(MESSAGES_URL, "send", {
        method: "POST",
        body: JSON.stringify({ receiver_id: receiverId, text }),
      }),

    markRead: (userId: number) =>
      request(MESSAGES_URL, `read/${userId}`, { method: "POST" }),
  },
};
