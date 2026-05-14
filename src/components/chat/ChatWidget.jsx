import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCheck,
  MessageCircle,
  Search,
  Send,
  X,
} from "lucide-react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api/v1`;
const SOCKET_URL = import.meta.env.VITE_API_URL;
const CHAT_ALLOWED_ROLES = ["employee", "superAdmin", "admin", "leader"];

const getToken = () => localStorage.getItem("token");
const getCurrentUserId = () => Number(localStorage.getItem("userId"));
const getCurrentRole = () => localStorage.getItem("role");

const getDisplayName = (user) => {
  const name = `${user?.FirstName || ""} ${user?.LastName || ""}`.trim();
  return name || user?.Email || `User ${user?.Id || ""}`.trim();
};

const getInitials = (user) =>
  getDisplayName(user)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const authHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || "Request failed");
  }
  return payload;
};

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [messageText, setMessageText] = useState("");
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);

  const socketRef = useRef(null);
  const selectedConversationRef = useRef(null);
  const messagesEndRef = useRef(null);
  const currentUserId = getCurrentUserId();
  const canUseChat = CHAT_ALLOWED_ROLES.includes(getCurrentRole());

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  const loadUsers = useCallback(async () => {
    if (!canUseChat || !isOpen) return;
    try {
      const query = searchTerm.trim()
        ? `?searchTerm=${encodeURIComponent(searchTerm.trim())}`
        : "";
      const result = await apiRequest(`/chat/users${query}`);
      setUsers(result?.data || []);
    } catch (error) {
      toast.error(error.message);
    }
  }, [canUseChat, isOpen, searchTerm]);

  const loadConversations = useCallback(async () => {
    if (!canUseChat) return;
    try {
      const result = await apiRequest("/chat/conversations?limit=50");
      const rows = result?.data || [];
      setConversations(rows);
      setUnreadTotal(
        rows.reduce((sum, item) => sum + Number(item.unreadCount || 0), 0),
      );
    } catch (error) {
      console.error("Failed to load chat conversations", error);
    }
  }, [canUseChat]);

  const markRead = useCallback(async (conversationId) => {
    if (!conversationId) return;
    try {
      await apiRequest(`/chat/conversations/${conversationId}/read`, {
        method: "PUT",
      });
    } catch (error) {
      console.error("Failed to mark chat read", error);
    }
  }, []);

  const loadMessages = useCallback(
    async (conversation, otherUser) => {
      if (!conversation?.Id) {
        setSelectedConversation(null);
        setSelectedUser(otherUser || null);
        setMessages([]);
        return;
      }

      try {
        const result = await apiRequest(
          `/chat/conversations/${conversation.Id}/messages?limit=80`,
        );
        const data = result?.data || {};
        setSelectedConversation(data.conversation || conversation);
        setSelectedUser(data.otherUser || otherUser || conversation.otherUser);
        setMessages(data.messages || []);
        selectedConversationRef.current = data.conversation || conversation;
        socketRef.current?.emit("chat:conversation:join", {
          conversationId: conversation.Id,
        });
        await markRead(conversation.Id);
        setConversations((prev) =>
          prev.map((item) =>
            item.Id === conversation.Id ? { ...item, unreadCount: 0 } : item,
          ),
        );
        setUnreadTotal((prev) =>
          Math.max(0, prev - Number(conversation.unreadCount || 0)),
        );
        scrollToBottom();
      } catch (error) {
        toast.error(error.message);
      }
    },
    [markRead, scrollToBottom],
  );

  const openUserChat = async (user) => {
    setSelectedUser(user);
    setSelectedConversation(null);
    setMessages([]);
    selectedConversationRef.current = null;

    try {
      const result = await apiRequest(`/chat/users/${user.Id}/conversation`);
      if (result?.data) {
        await loadMessages(result.data, user);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const updateConversationFromMessage = useCallback(
    (conversationId, message) => {
      const otherUser =
        Number(message.senderUserId) === currentUserId
          ? message.receiver
          : message.sender;

      setConversations((prev) => {
        const existing = prev.find(
          (item) => Number(item.Id) === Number(conversationId),
        );
        const rest = prev.filter(
          (item) => Number(item.Id) !== Number(conversationId),
        );
        const isSelected =
          Number(selectedConversationRef.current?.Id) ===
          Number(conversationId);
        const shouldCountUnread =
          Number(message.receiverUserId) === currentUserId && !isSelected;

        const nextConversation = {
          ...(existing || {}),
          Id: conversationId,
          lastMessage: message,
          lastMessageId: message.Id,
          lastMessageAt: message.createdAt,
          otherUser,
          unreadCount: shouldCountUnread
            ? Number(existing?.unreadCount || 0) + 1
            : existing?.unreadCount || 0,
        };

        if (shouldCountUnread) setUnreadTotal((count) => count + 1);
        return [nextConversation, ...rest];
      });
    },
    [currentUserId],
  );

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const timer = setTimeout(loadUsers, 250);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  useEffect(() => {
    if (!canUseChat) return undefined;
    const token = getToken();
    if (!token) return undefined;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;
    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("chat:message:new", async (payload) => {
      const conversationId = Number(payload?.conversationId);
      const message = payload?.message;
      if (!conversationId || !message) return;

      updateConversationFromMessage(conversationId, message);

      if (Number(selectedConversationRef.current?.Id) === conversationId) {
        setMessages((prev) =>
          prev.some((item) => Number(item.Id) === Number(message.Id))
            ? prev
            : [...prev, message],
        );
        scrollToBottom();
        if (Number(message.receiverUserId) === currentUserId) {
          await markRead(conversationId);
        }
      }
    });

    socket.on("chat:messages:read", (payload) => {
      if (
        Number(selectedConversationRef.current?.Id) !==
        Number(payload?.conversationId)
      ) {
        return;
      }

      setMessages((prev) =>
        prev.map((message) =>
          Number(message.senderUserId) === currentUserId
            ? { ...message, isRead: true, readAt: payload.readAt }
            : message,
        ),
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    canUseChat,
    currentUserId,
    markRead,
    scrollToBottom,
    updateConversationFromMessage,
  ]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const text = messageText.trim();
    if (!text || !selectedUser) return;

    setMessageText("");
    try {
      const result = await apiRequest("/chat/messages", {
        method: "POST",
        body: JSON.stringify({
          receiverUserId: selectedUser.Id,
          message: text,
          messageType: "text",
        }),
      });
      const conversationId = result?.data?.conversationId;
      const message = result?.data?.message;

      if (conversationId && message) {
        setSelectedConversation((prev) => prev || { Id: conversationId });
        selectedConversationRef.current = { Id: conversationId };
        setMessages((prev) =>
          prev.some((item) => Number(item.Id) === Number(message.Id))
            ? prev
            : [...prev, message],
        );
        updateConversationFromMessage(conversationId, message);
        socketRef.current?.emit("chat:conversation:join", { conversationId });
        scrollToBottom();
      }
    } catch (error) {
      setMessageText(text);
      toast.error(error.message);
    }
  };

  if (!canUseChat) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[70]">
      {isOpen ? (
        <div className="flex h-[620px] w-[min(92vw,380px)] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
          <div className="flex h-14 items-center justify-between border-b border-slate-200 bg-indigo-600 px-4 text-white">
            <div>
              <div className="text-sm font-semibold">Chat</div>
              <div className="text-[11px] text-indigo-100">
                {socketConnected ? "Online" : "Connecting"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          {selectedUser ? (
            <>
              <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setSelectedConversation(null);
                    selectedConversationRef.current = null;
                    setMessages([]);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200"
                >
                  <ArrowLeft size={17} />
                </button>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-700">
                  {getInitials(selectedUser)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {getDisplayName(selectedUser)}
                  </div>
                  <div className="text-xs capitalize text-slate-500">
                    {selectedUser.role}
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-3 py-3">
                <div className="space-y-2">
                  {messages.map((message) => {
                    const mine = Number(message.senderUserId) === currentUserId;
                    return (
                      <div
                        key={message.Id}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[78%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                            mine
                              ? "bg-indigo-600 text-white"
                              : "border border-slate-200 bg-white text-slate-800"
                          }`}
                        >
                          <div className="whitespace-pre-wrap break-words">
                            {message.message}
                          </div>
                          <div
                            className={`mt-1 flex justify-end gap-1 text-[10px] ${
                              mine ? "text-indigo-100" : "text-slate-400"
                            }`}
                          >
                            {new Date(message.createdAt).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                            {mine ? <CheckCheck size={12} /> : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <form
                onSubmit={sendMessage}
                className="flex items-center gap-2 border-t border-slate-200 p-3"
              >
                <input
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 caret-indigo-600 outline-none placeholder:text-slate-400 focus:border-indigo-300"
                  placeholder="Type a message"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim()}
                  className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-600 text-white disabled:bg-slate-300"
                  title="Send"
                >
                  <Send size={17} />
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="border-b border-slate-200 p-3">
                <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3">
                  <Search size={16} className="text-slate-400" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 caret-indigo-600 outline-none placeholder:text-slate-400"
                    placeholder="Search people"
                  />
                </label>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="px-4 pb-2 pt-4 text-xs font-bold uppercase text-slate-400">
                  Recent
                </div>
                {conversations.map((conversation) => (
                  <button
                    key={conversation.Id}
                    type="button"
                    onClick={() =>
                      loadMessages(conversation, conversation.otherUser)
                    }
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                      {getInitials(conversation.otherUser)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {getDisplayName(conversation.otherUser)}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {conversation.lastMessage?.message || "Start chat"}
                      </div>
                    </div>
                    {conversation.unreadCount > 0 ? (
                      <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">
                        {conversation.unreadCount}
                      </span>
                    ) : null}
                  </button>
                ))}

                <div className="px-4 pb-2 pt-4 text-xs font-bold uppercase text-slate-400">
                  People
                </div>
                {users.map((user) => (
                  <button
                    key={user.Id}
                    type="button"
                    onClick={() => openUserChat(user)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                      {getInitials(user)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {getDisplayName(user)}
                      </div>
                      <div className="truncate text-xs capitalize text-slate-500">
                        {user.role}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-2xl shadow-indigo-300 transition hover:bg-indigo-700"
          title="Open chat"
        >
          <MessageCircle size={24} />
          {unreadTotal > 0 ? (
            <span className="absolute -right-1 -top-1 min-w-[20px] rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
              {unreadTotal}
            </span>
          ) : null}
        </button>
      )}
    </div>
  );
};

export default ChatWidget;
