import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";

const FAMILY_IMAGE = "https://cdn.poehali.dev/projects/d1338bc4-9189-4bc0-bbdd-f40c3c422b51/files/02b37e7a-618c-4c3a-acad-8136ee03087c.jpg";

const AVATARS = ["👩", "👨", "👧", "👦", "👴", "👵", "🧑", "👩‍🦰", "👨‍🦱", "🧒"];

type AuthStep = "phone" | "otp" | "register";
type Tab = "chats" | "family" | "monitor";

interface User {
  id: number;
  name: string;
  phone: string;
  role: "parent" | "child";
  avatar: string;
  age?: number;
  family_id: number;
  is_restricted: boolean;
}

interface ChatItem {
  id: number;
  name: string;
  avatar: string;
  role: string;
  is_restricted: boolean;
  last_message: string | null;
  last_time: string | null;
  unread_count: number;
}

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  text: string;
  is_read: boolean;
  created_at: string;
}

function formatTime(dt: string | null): string {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

// ─── AUTH SCREEN ─────────────────────────────────────────────────────────────

function AuthScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [step, setStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("👩");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  async function handleSendOtp() {
    if (!phone.trim()) return setError("Введите номер телефона");
    setLoading(true); setError("");
    const res = await api.auth.sendOtp(phone.trim());
    setLoading(false);
    if (!res.ok) return setError(res.data.error || "Ошибка отправки");
    setStep("otp"); setResendTimer(60);
  }

  async function handleVerifyOtp() {
    if (code.length !== 6) return setError("Введите 6-значный код");
    setLoading(true); setError("");
    const res = await api.auth.verifyOtp(phone.trim(), code.trim());
    setLoading(false);
    if (!res.ok) return setError(res.data.error || "Неверный код");
    if (res.data.registered) {
      api.setToken(res.data.token);
      const me = await api.auth.me();
      if (me.ok) onLogin(me.data.user);
    } else {
      setStep("register");
    }
  }

  async function handleRegister() {
    if (!name.trim()) return setError("Введите ваше имя");
    setLoading(true); setError("");
    const res = await api.auth.register(phone.trim(), name.trim(), avatar);
    setLoading(false);
    if (!res.ok) return setError(res.data.error || "Ошибка регистрации");
    api.setToken(res.data.token);
    const me = await api.auth.me();
    if (me.ok) onLogin(me.data.user);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-pattern bg-background p-4">
      <div className="w-full max-w-sm animate-pop">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl overflow-hidden mx-auto mb-4 shadow-lg ring-4 ring-white">
            <img src={FAMILY_IMAGE} alt="СемьяЧат" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-nunito font-extrabold text-2xl text-foreground">СемьяЧат</h1>
          <p className="text-muted-foreground text-sm mt-1">Общение близких</p>
        </div>

        <div className="bg-white/90 rounded-3xl p-6 shadow-lg border border-border">
          {step === "phone" && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="font-nunito font-bold text-lg text-foreground mb-1">Вход в приложение</h2>
                <p className="text-sm text-muted-foreground">Введите номер — отправим SMS-код</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Номер телефона</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSendOtp()}
                  placeholder="+7 900 123-45-67"
                  className="mt-1.5 w-full px-4 py-3 rounded-2xl border border-border bg-secondary/40 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm" />
              </div>
              {error && <p className="text-destructive text-xs">{error}</p>}
              <button onClick={handleSendOtp} disabled={loading}
                className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-nunito font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all">
                {loading ? "Отправляем..." : "Получить код →"}
              </button>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="font-nunito font-bold text-lg text-foreground mb-1">Введите код</h2>
                <p className="text-sm text-muted-foreground">SMS отправлено на <span className="font-semibold text-foreground">{phone}</span></p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Код из SMS</label>
                <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={e => e.key === "Enter" && handleVerifyOtp()} placeholder="123456" maxLength={6}
                  className="mt-1.5 w-full px-4 py-3 rounded-2xl border border-border bg-secondary/40 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-center text-2xl font-nunito font-bold tracking-widest" />
              </div>
              {error && <p className="text-destructive text-xs">{error}</p>}
              <button onClick={handleVerifyOtp} disabled={loading || code.length !== 6}
                className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-nunito font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all">
                {loading ? "Проверяем..." : "Войти →"}
              </button>
              <div className="text-center">
                {resendTimer > 0
                  ? <p className="text-xs text-muted-foreground">Повторно через {resendTimer} сек</p>
                  : <button onClick={() => { setStep("phone"); setCode(""); setError(""); }} className="text-xs text-primary hover:underline">Изменить номер</button>}
              </div>
            </div>
          )}

          {step === "register" && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="font-nunito font-bold text-lg text-foreground mb-1">Создайте профиль</h2>
                <p className="text-sm text-muted-foreground">Вы станете первым родителем и создадите семью</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ваше имя</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Например: Мама или Анна"
                  className="mt-1.5 w-full px-4 py-3 rounded-2xl border border-border bg-secondary/40 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Аватар</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {AVATARS.map(a => (
                    <button key={a} onClick={() => setAvatar(a)}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${avatar === a ? "bg-primary/20 ring-2 ring-primary" : "bg-secondary hover:bg-secondary/80"}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-destructive text-xs">{error}</p>}
              <button onClick={handleRegister} disabled={loading}
                className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-nunito font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all">
                {loading ? "Создаём..." : "Создать семью 🏠"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── INVITE MODAL ─────────────────────────────────────────────────────────────

function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"child" | "parent">("child");
  const [avatar, setAvatar] = useState("👧");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleInvite() {
    if (!phone.trim() || !name.trim()) return setError("Заполните имя и номер");
    setLoading(true);
    const res = await api.family.invite(phone.trim(), name.trim(), role, avatar, age ? Number(age) : undefined);
    setLoading(false);
    if (!res.ok) return setError(res.data.error || "Ошибка");
    onInvited(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl animate-pop">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-nunito font-bold text-lg text-foreground">Добавить участника</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-secondary transition-colors text-muted-foreground">
            <Icon name="X" size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["child", "parent"] as const).map(r => (
              <button key={r} onClick={() => { setRole(r); setAvatar(r === "child" ? "👧" : "👨"); }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${role === r ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                {r === "child" ? "Ребёнок" : "Родитель"}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Аватар</label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {AVATARS.map(a => (
                <button key={a} onClick={() => setAvatar(a)}
                  className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${avatar === a ? "bg-primary/20 ring-2 ring-primary" : "bg-secondary"}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Имя"
            className="w-full px-4 py-2.5 rounded-2xl border border-border bg-secondary/40 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Номер телефона"
            className="w-full px-4 py-2.5 rounded-2xl border border-border bg-secondary/40 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          {role === "child" && (
            <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="Возраст (необязательно)"
              className="w-full px-4 py-2.5 rounded-2xl border border-border bg-secondary/40 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          )}
          {error && <p className="text-destructive text-xs">{error}</p>}
          <button onClick={handleInvite} disabled={loading}
            className="w-full py-2.5 rounded-2xl bg-primary text-primary-foreground font-nunito font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all">
            {loading ? "Добавляем..." : "Добавить в семью"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("chats");
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [activeChatUser, setActiveChatUser] = useState<ChatItem | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = api.getToken();
    if (!token) { setAuthChecked(true); return; }
    api.auth.me().then(res => {
      if (res.ok) setUser(res.data.user);
      else api.clearToken();
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    if (user) { loadChats(); loadMembers(); }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadChats() {
    setLoadingChats(true);
    const res = await api.messages.chats();
    setLoadingChats(false);
    if (res.ok) setChats(res.data.chats);
  }

  async function loadMembers() {
    const res = await api.family.members();
    if (res.ok) setMembers(res.data.members);
  }

  async function openChat(chatUser: ChatItem) {
    setActiveChatUser(chatUser);
    const res = await api.messages.history(chatUser.id);
    if (res.ok) setMessages(res.data.messages);
    await api.messages.markRead(chatUser.id);
    setChats(prev => prev.map(c => c.id === chatUser.id ? { ...c, unread_count: 0 } : c));
  }

  async function sendMessage() {
    if (!inputText.trim() || !activeChatUser) return;
    const text = inputText.trim();
    setInputText("");
    const res = await api.messages.send(activeChatUser.id, text);
    if (res.ok) {
      const newMsg: Message = {
        id: res.data.id, sender_id: user!.id, receiver_id: activeChatUser.id,
        text, is_read: false, created_at: res.data.created_at,
      };
      setMessages(prev => [...prev, newMsg]);
      loadChats();
    }
  }

  async function toggleRestrict(memberId: number, current: boolean) {
    await api.family.updateMember(memberId, { is_restricted: !current });
    loadMembers();
  }

  async function handleLogout() {
    await api.auth.logout();
    api.clearToken();
    setUser(null); setChats([]); setMembers([]); setActiveChatUser(null);
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-pattern bg-background">
        <div className="text-center animate-fade-in">
          <div className="text-4xl mb-3">🏠</div>
          <p className="text-muted-foreground text-sm font-nunito">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen onLogin={setUser} />;

  const totalUnread = chats.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  const children = members.filter(m => m.role === "child");
  const isParent = user.role === "parent";

  return (
    <div className="h-screen flex flex-col bg-warm-pattern bg-background overflow-hidden">
      {showInvite && (
        <InviteModal onClose={() => setShowInvite(false)} onInvited={() => { loadMembers(); loadChats(); }} />
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 bg-white/85 backdrop-blur-sm border-b border-border shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🏠</span>
          <span className="font-nunito font-extrabold text-xl text-foreground tracking-tight">СемьяЧат</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-secondary rounded-full px-3 py-1.5">
            <span className="text-base">{user.avatar}</span>
            <span className="text-sm font-semibold text-foreground">{user.name}</span>
            <div className="w-2 h-2 rounded-full bg-green-400" />
          </div>
          <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground" title="Выйти">
            <Icon name="LogOut" size={16} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 flex flex-col bg-white/70 border-r border-border flex-shrink-0">
          <div className="flex border-b border-border flex-shrink-0">
            {([
              { key: "chats" as Tab, icon: "MessageCircle", label: "Чаты", badge: totalUnread },
              { key: "family" as Tab, icon: "Users", label: "Семья" },
              ...(isParent ? [{ key: "monitor" as Tab, icon: "Shield", label: "Контроль", badge: 0 }] : []),
            ]).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition-all relative
                  ${activeTab === tab.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <Icon name={tab.icon} size={18} />
                {tab.label}
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute top-1.5 right-3 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{tab.badge}</span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
            {/* CHATS */}
            {activeTab === "chats" && (
              <>
                {loadingChats && <div className="text-center py-8 text-muted-foreground text-sm">Загрузка...</div>}
                {!loadingChats && chats.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm mb-2">Нет чатов</p>
                    {isParent && <button onClick={() => setShowInvite(true)} className="text-xs text-primary hover:underline">Добавить участника</button>}
                  </div>
                )}
                {chats.map((chat, i) => (
                  <button key={chat.id} onClick={() => openChat(chat)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left animate-slide-up
                      ${activeChatUser?.id === chat.id ? "bg-primary/10 border border-primary/20" : "hover:bg-secondary/60 border border-transparent"}`}
                    style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="w-11 h-11 rounded-2xl bg-secondary flex items-center justify-center text-xl flex-shrink-0">{chat.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-nunito font-bold text-sm text-foreground">{chat.name}</span>
                        {chat.unread_count > 0 && (
                          <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">{chat.unread_count}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{chat.last_message ?? "Нет сообщений"}</p>
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* FAMILY */}
            {activeTab === "family" && (
              <div className="space-y-3 animate-fade-in">
                <div className="rounded-2xl overflow-hidden shadow-sm">
                  <img src={FAMILY_IMAGE} alt="Семья" className="w-full h-28 object-cover" />
                  <div className="bg-secondary/50 px-3 py-2 text-center">
                    <p className="text-xs font-semibold text-foreground font-nunito">Наша семья ❤️</p>
                  </div>
                </div>
                {isParent && (
                  <button onClick={() => setShowInvite(true)}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-2xl border-2 border-dashed border-primary/30 text-primary text-sm font-semibold hover:bg-primary/5 transition-colors">
                    <Icon name="UserPlus" size={16} />Добавить участника
                  </button>
                )}
                {members.map((member, i) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 border border-border animate-slide-up shadow-sm" style={{ animationDelay: `${i * 70}ms` }}>
                    <div className="w-11 h-11 rounded-2xl bg-secondary flex items-center justify-center text-xl">{member.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-nunito font-bold text-sm text-foreground">{member.name}</span>
                        {member.id === user.id && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">Вы</span>}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${member.role === "parent" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                          {member.role === "parent" ? "Родитель" : member.age ? `${member.age} лет` : "Ребёнок"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{member.phone}</p>
                    </div>
                    {member.id !== user.id && (() => {
                      const c = chats.find(c => c.id === member.id);
                      return c ? (
                        <button onClick={() => { setActiveTab("chats"); openChat(c); }}
                          className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors">
                          <Icon name="MessageCircle" size={16} />
                        </button>
                      ) : null;
                    })()}
                  </div>
                ))}
              </div>
            )}

            {/* MONITOR */}
            {activeTab === "monitor" && isParent && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon name="Shield" size={16} className="text-amber-600" />
                    <span className="text-sm font-nunito font-bold text-amber-800">Родительский контроль</span>
                  </div>
                  <p className="text-xs text-amber-700">Управляйте ограничениями для детей</p>
                </div>
                {children.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">Детей пока нет</p>
                    <button onClick={() => setShowInvite(true)} className="mt-2 text-xs text-primary hover:underline">Добавить ребёнка</button>
                  </div>
                ) : children.map((child, i) => (
                  <div key={child.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 border border-border animate-slide-up shadow-sm" style={{ animationDelay: `${i * 70}ms` }}>
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl">{child.avatar}</div>
                    <div className="flex-1">
                      <p className="font-nunito font-bold text-sm text-foreground">{child.name}</p>
                      <p className="text-xs text-muted-foreground">{child.age ? `${child.age} лет` : "Возраст не указан"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] text-muted-foreground">Ограничения</span>
                      <button onClick={() => toggleRestrict(child.id, child.is_restricted)}
                        className={`w-10 h-5 rounded-full transition-all relative flex-shrink-0 ${child.is_restricted ? "bg-primary" : "bg-gray-200"}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${child.is_restricted ? "left-5" : "left-0.5"}`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Chat / Welcome */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {!activeChatUser ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 animate-fade-in">
              <div className="w-28 h-28 rounded-3xl overflow-hidden shadow-lg ring-4 ring-white">
                <img src={FAMILY_IMAGE} alt="Семья" className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <h1 className="font-nunito font-extrabold text-2xl text-foreground mb-2">Привет, {user.name}! 👋</h1>
                <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
                  {chats.length > 0
                    ? "Выберите чат слева, чтобы начать общение."
                    : isParent
                      ? "Добавьте участников через раздел «Семья»."
                      : "Ожидайте, пока родитель добавит вас в семью."}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
                {[
                  { icon: "MessageCircle", label: "Чатов", val: chats.length, color: "bg-amber-100 text-amber-700" },
                  { icon: "Users", label: "В семье", val: members.length, color: "bg-orange-100 text-orange-700" },
                  { icon: "Heart", label: "Детей", val: children.length, color: "bg-rose-100 text-rose-700" },
                ].map((stat, i) => (
                  <div key={stat.label} className="bg-white/90 rounded-2xl p-4 flex flex-col items-center gap-1.5 border border-border animate-pop shadow-sm" style={{ animationDelay: `${200 + i * 80}ms` }}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.color}`}>
                      <Icon name={stat.icon} size={18} />
                    </div>
                    <span className="font-nunito font-extrabold text-xl text-foreground">{stat.val}</span>
                    <span className="text-[11px] text-muted-foreground">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-5 py-3 bg-white/85 backdrop-blur-sm border-b border-border flex-shrink-0">
                <button onClick={() => setActiveChatUser(null)} className="p-1.5 rounded-xl hover:bg-secondary transition-colors text-muted-foreground">
                  <Icon name="ArrowLeft" size={18} />
                </button>
                <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center text-xl">{activeChatUser.avatar}</div>
                <div className="flex-1">
                  <p className="font-nunito font-bold text-sm text-foreground">{activeChatUser.name}</p>
                  <p className="text-xs text-muted-foreground">{activeChatUser.role === "parent" ? "Родитель" : "Ребёнок"}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-sm animate-fade-in">Напишите первое сообщение</div>
                )}
                {messages.map((msg, i) => {
                  const isMe = msg.sender_id === user.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} msg-bubble-in`} style={{ animationDelay: `${i * 30}ms` }}>
                      {!isMe && (
                        <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-base mr-2 flex-shrink-0 self-end">{activeChatUser.avatar}</div>
                      )}
                      <div className={`max-w-[65%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-white text-foreground rounded-bl-sm border border-border"}`}>
                          {msg.text}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                          {isMe && <Icon name={msg.is_read ? "CheckCheck" : "Check"} size={12} className={msg.is_read ? "text-primary" : "text-muted-foreground"} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="px-4 py-3 bg-white/85 backdrop-blur-sm border-t border-border flex-shrink-0">
                <div className="flex items-center gap-2 bg-secondary/60 rounded-2xl px-4 py-2">
                  <input type="text" value={inputText} onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Напишите сообщение..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
                  <button onClick={sendMessage} disabled={!inputText.trim()}
                    className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center transition-all hover:opacity-90 disabled:opacity-40 flex-shrink-0">
                    <Icon name="Send" size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
