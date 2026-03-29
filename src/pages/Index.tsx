import { useState } from "react";
import Icon from "@/components/ui/icon";

const FAMILY_IMAGE = "https://cdn.poehali.dev/projects/d1338bc4-9189-4bc0-bbdd-f40c3c422b51/files/02b37e7a-618c-4c3a-acad-8136ee03087c.jpg";

type Role = "parent" | "child";
type Tab = "chats" | "family" | "monitor";

interface FamilyMember {
  id: number;
  name: string;
  role: Role;
  avatar: string;
  age?: number;
  status: "online" | "offline" | "away";
  lastSeen?: string;
  restricted?: boolean;
}

interface Message {
  id: number;
  senderId: number;
  text: string;
  time: string;
  read: boolean;
}

interface Chat {
  id: number;
  memberId: number;
  messages: Message[];
  unread: number;
}

interface ActivityLog {
  id: number;
  memberId: number;
  action: string;
  time: string;
}

const INIT_MEMBERS: FamilyMember[] = [
  { id: 1, name: "Мама", role: "parent", avatar: "👩", status: "online" },
  { id: 2, name: "Папа", role: "parent", avatar: "👨", status: "away", lastSeen: "10 мин назад" },
  { id: 3, name: "Соня", role: "child", avatar: "👧", age: 12, status: "online", restricted: false },
  { id: 4, name: "Миша", role: "child", avatar: "👦", age: 8, status: "offline", lastSeen: "2 ч назад", restricted: true },
];

const INIT_CHATS: Chat[] = [
  {
    id: 1, memberId: 2, unread: 2,
    messages: [
      { id: 1, senderId: 2, text: "Привет, как дела? 😊", time: "10:15", read: true },
      { id: 2, senderId: 1, text: "Всё хорошо! Буду дома в 18:00", time: "10:18", read: true },
      { id: 3, senderId: 2, text: "Окей, куплю продукты по дороге", time: "10:20", read: true },
      { id: 4, senderId: 2, text: "Что нужно купить?", time: "10:21", read: false },
      { id: 5, senderId: 2, text: "Напиши список 🛒", time: "10:22", read: false },
    ]
  },
  {
    id: 2, memberId: 3, unread: 0,
    messages: [
      { id: 1, senderId: 3, text: "Мама, я уже в школе!", time: "08:02", read: true },
      { id: 2, senderId: 1, text: "Хорошо, моя умница! ❤️", time: "08:05", read: true },
      { id: 3, senderId: 3, text: "После уроков пойдём в кино?", time: "14:30", read: true },
      { id: 4, senderId: 1, text: "Конечно! Выбирай фильм 🎬", time: "14:33", read: true },
    ]
  },
  {
    id: 3, memberId: 4, unread: 1,
    messages: [
      { id: 1, senderId: 4, text: "Мааам, когда обед?", time: "12:00", read: true },
      { id: 2, senderId: 1, text: "Через полчасика, мой хомячок 😄", time: "12:02", read: true },
      { id: 3, senderId: 4, text: "Ура! Я так голоден!", time: "12:03", read: false },
    ]
  },
];

const ACTIVITY: ActivityLog[] = [
  { id: 1, memberId: 3, action: "Открыла приложение", time: "14:32" },
  { id: 2, memberId: 4, action: "Прочитал сообщение от Мамы", time: "12:03" },
  { id: 3, memberId: 3, action: "Отправила сообщение Маме", time: "11:45" },
  { id: 4, memberId: 4, action: "Вошёл в систему", time: "10:00" },
  { id: 5, memberId: 3, action: "Изменила статус на «В сети»", time: "08:01" },
];

const ME = INIT_MEMBERS[0];

function statusColor(status: FamilyMember["status"]) {
  if (status === "online") return "bg-green-400";
  if (status === "away") return "bg-amber-400";
  return "bg-gray-300";
}

function statusLabel(member: FamilyMember) {
  if (member.status === "online") return "В сети";
  if (member.status === "away") return "Отходил";
  return member.lastSeen ?? "Не в сети";
}

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>("chats");
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [inputText, setInputText] = useState("");
  const [chats, setChats] = useState<Chat[]>(INIT_CHATS);
  const [members, setMembers] = useState<FamilyMember[]>(INIT_MEMBERS);
  const [showWelcome, setShowWelcome] = useState(true);

  const activeChat = chats.find(c => c.id === activeChatId) ?? null;
  const activeMember = activeChat ? members.find(m => m.id === activeChat.memberId) : null;
  const totalUnread = chats.reduce((sum, c) => sum + c.unread, 0);
  const children = members.filter(m => m.role === "child");

  function openChat(chatId: number) {
    if (!chatId) return;
    setActiveChatId(chatId);
    setShowWelcome(false);
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, unread: 0 } : c));
  }

  function sendMessage() {
    if (!inputText.trim() || !activeChatId) return;
    const newMsg: Message = {
      id: Date.now(),
      senderId: ME.id,
      text: inputText.trim(),
      time: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
      read: false,
    };
    setChats(prev => prev.map(c =>
      c.id === activeChatId ? { ...c, messages: [...c.messages, newMsg] } : c
    ));
    setInputText("");
  }

  function toggleRestrict(memberId: number) {
    setMembers(prev => prev.map(m =>
      m.id === memberId ? { ...m, restricted: !m.restricted } : m
    ));
  }

  return (
    <div className="h-screen flex flex-col bg-warm-pattern bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 bg-white/85 backdrop-blur-sm border-b border-border shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🏠</span>
          <span className="font-nunito font-extrabold text-xl text-foreground tracking-tight">СемьяЧат</span>
        </div>
        <div className="flex items-center gap-2 bg-secondary rounded-full px-3 py-1.5">
          <span className="text-base">{ME.avatar}</span>
          <span className="text-sm font-semibold text-foreground">{ME.name}</span>
          <div className="w-2 h-2 rounded-full bg-green-400" />
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-72 flex flex-col bg-white/70 border-r border-border flex-shrink-0">
          {/* Tabs */}
          <div className="flex border-b border-border flex-shrink-0">
            {([
              { key: "chats" as Tab, icon: "MessageCircle", label: "Чаты", badge: totalUnread },
              { key: "family" as Tab, icon: "Users", label: "Семья" },
              { key: "monitor" as Tab, icon: "Shield", label: "Контроль" },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition-all relative
                  ${activeTab === tab.key
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Icon name={tab.icon} size={18} />
                {tab.label}
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute top-1.5 right-3 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {/* Sidebar scroll */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">

            {/* CHATS */}
            {activeTab === "chats" && chats.map((chat, i) => {
              const member = members.find(m => m.id === chat.memberId);
              if (!member) return null;
              const lastMsg = chat.messages[chat.messages.length - 1];
              const isActive = activeChatId === chat.id;
              return (
                <button
                  key={chat.id}
                  onClick={() => openChat(chat.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left animate-slide-up
                    ${isActive
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-secondary/60 border border-transparent"
                    }`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-2xl bg-secondary flex items-center justify-center text-xl">
                      {member.avatar}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusColor(member.status)}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-nunito font-bold text-sm text-foreground">{member.name}</span>
                      {chat.unread > 0 && (
                        <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                          {chat.unread}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{lastMsg?.text ?? "Нет сообщений"}</p>
                  </div>
                </button>
              );
            })}

            {/* FAMILY */}
            {activeTab === "family" && (
              <div className="space-y-3 animate-fade-in">
                <div className="rounded-2xl overflow-hidden mb-4 shadow-sm">
                  <img src={FAMILY_IMAGE} alt="Семья" className="w-full h-32 object-cover" />
                  <div className="bg-secondary/50 px-3 py-2">
                    <p className="text-xs font-semibold text-foreground text-center font-nunito">Наша семья ❤️</p>
                  </div>
                </div>
                {members.map((member, i) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 border border-border animate-slide-up shadow-sm"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="relative">
                      <div className="w-11 h-11 rounded-2xl bg-secondary flex items-center justify-center text-xl">{member.avatar}</div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusColor(member.status)}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-nunito font-bold text-sm text-foreground">{member.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${member.role === "parent" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                          {member.role === "parent" ? "Родитель" : `${member.age} лет`}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{statusLabel(member)}</p>
                    </div>
                    {member.id !== ME.id && (
                      <button
                        onClick={() => { const c = chats.find(c => c.memberId === member.id); if (c) { setActiveTab("chats"); openChat(c.id); } }}
                        className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                      >
                        <Icon name="MessageCircle" size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* MONITOR */}
            {activeTab === "monitor" && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon name="Shield" size={16} className="text-amber-600" />
                    <span className="text-sm font-nunito font-bold text-amber-800">Родительский контроль</span>
                  </div>
                  <p className="text-xs text-amber-700">Управляйте общением детей и следите за активностью</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Дети</p>
                  {children.map((child, i) => (
                    <div
                      key={child.id}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 border border-border mb-2 animate-slide-up shadow-sm"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl">{child.avatar}</div>
                      <div className="flex-1">
                        <p className="font-nunito font-bold text-sm text-foreground">{child.name}</p>
                        <p className="text-xs text-muted-foreground">{child.age} лет · {statusLabel(child)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-muted-foreground">Ограничения</span>
                        <button
                          onClick={() => toggleRestrict(child.id)}
                          className={`w-10 h-5 rounded-full transition-all relative flex-shrink-0 ${child.restricted ? "bg-primary" : "bg-gray-200"}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${child.restricted ? "left-5" : "left-0.5"}`} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Активность сегодня</p>
                  <div className="space-y-1.5">
                    {ACTIVITY.map((log, i) => {
                      const member = members.find(m => m.id === log.memberId);
                      return (
                        <div
                          key={log.id}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/60 border border-border animate-slide-up"
                          style={{ animationDelay: `${i * 60}ms` }}
                        >
                          <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-sm">{member?.avatar}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground">{member?.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{log.action}</p>
                          </div>
                          <span className="text-[11px] text-muted-foreground flex-shrink-0">{log.time}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Chat / Welcome area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {showWelcome || !activeChat ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 animate-fade-in">
              <div className="w-28 h-28 rounded-3xl overflow-hidden shadow-lg ring-4 ring-white">
                <img src={FAMILY_IMAGE} alt="Семья" className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <h1 className="font-nunito font-extrabold text-2xl text-foreground mb-2">Добро пожаловать, {ME.name}! 👋</h1>
                <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
                  Ваша семья всегда рядом. Выберите чат слева, чтобы начать общение.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
                {[
                  { icon: "MessageCircle", label: "Чатов", val: chats.length, color: "bg-amber-100 text-amber-700" },
                  { icon: "Users", label: "В семье", val: members.length, color: "bg-orange-100 text-orange-700" },
                  { icon: "Heart", label: "Детей", val: children.length, color: "bg-rose-100 text-rose-700" },
                ].map((stat, i) => (
                  <div
                    key={stat.label}
                    className="bg-white/90 rounded-2xl p-4 flex flex-col items-center gap-1.5 border border-border animate-pop shadow-sm"
                    style={{ animationDelay: `${200 + i * 80}ms` }}
                  >
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
              {/* Chat header */}
              <div className="flex items-center gap-3 px-5 py-3 bg-white/85 backdrop-blur-sm border-b border-border flex-shrink-0">
                <button
                  onClick={() => { setActiveChatId(null); setShowWelcome(true); }}
                  className="p-1.5 rounded-xl hover:bg-secondary transition-colors text-muted-foreground"
                >
                  <Icon name="ArrowLeft" size={18} />
                </button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center text-xl">{activeMember?.avatar}</div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusColor(activeMember?.status ?? "offline")}`} />
                </div>
                <div className="flex-1">
                  <p className="font-nunito font-bold text-sm text-foreground">{activeMember?.name}</p>
                  <p className="text-xs text-muted-foreground">{activeMember ? statusLabel(activeMember) : ""}</p>
                </div>
                <button className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground">
                  <Icon name="Phone" size={18} />
                </button>
                <button className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground">
                  <Icon name="MoreVertical" size={18} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-3">
                {activeChat.messages.map((msg, i) => {
                  const isMe = msg.senderId === ME.id;
                  const sender = members.find(m => m.id === msg.senderId);
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"} msg-bubble-in`}
                      style={{ animationDelay: `${i * 35}ms` }}
                    >
                      {!isMe && (
                        <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-base mr-2 flex-shrink-0 self-end">
                          {sender?.avatar}
                        </div>
                      )}
                      <div className={`max-w-[65%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm
                          ${isMe
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-white text-foreground rounded-bl-sm border border-border"
                          }`}
                        >
                          {msg.text}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-muted-foreground">{msg.time}</span>
                          {isMe && (
                            <Icon
                              name={msg.read ? "CheckCheck" : "Check"}
                              size={12}
                              className={msg.read ? "text-primary" : "text-muted-foreground"}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input */}
              <div className="px-4 py-3 bg-white/85 backdrop-blur-sm border-t border-border flex-shrink-0">
                <div className="flex items-center gap-2 bg-secondary/60 rounded-2xl px-4 py-2">
                  <button className="p-1 text-muted-foreground hover:text-primary transition-colors">
                    <Icon name="Smile" size={20} />
                  </button>
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMessage()}
                    placeholder="Напишите сообщение..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  />
                  <button className="p-1 text-muted-foreground hover:text-primary transition-colors">
                    <Icon name="Paperclip" size={20} />
                  </button>
                  <button
                    onClick={sendMessage}
                    disabled={!inputText.trim()}
                    className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center transition-all hover:opacity-90 disabled:opacity-40 flex-shrink-0"
                  >
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
