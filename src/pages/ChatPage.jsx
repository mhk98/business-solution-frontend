import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCheck,
  MessageCircle,
  Search,
  Send,
  UserRound,
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

const getInitials = (user) => {
  const name = getDisplayName(user);
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

const getMessagePreview = (conversation) =>
  conversation?.lastMessage?.message || "Start a conversation";

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

const ChatPage = () => {
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [messageText, setMessageText] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const selectedConversationRef = useRef(null);
  const currentUserId = getCurrentUserId();
  const currentRole = getCurrentRole();
  const canUseChat = CHAT_ALLOWED_ROLES.includes(currentRole);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  const loadUsers = useCallback(async () => {
    if (!canUseChat) return;
    setLoadingUsers(true);
    try {
      const query = searchTerm.trim()
        ? `?searchTerm=${encodeURIComponent(searchTerm.trim())}`
        : "";
      const result = await apiRequest(`/chat/users${query}`);
      setUsers(result?.data || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingUsers(false);
    }
  }, [canUseChat, searchTerm]);

  const loadConversations = useCallback(async () => {
    if (!canUseChat) return;
    setLoadingConversations(true);
    try {
      const result = await apiRequest("/chat/conversations?limit=50");
      setConversations(result?.data || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingConversations(false);
    }
  }, [canUseChat]);

  const markRead = useCallback(async (conversationId) => {
    if (!conversationId) return;
    try {
      await apiRequest(`/chat/conversations/${conversationId}/read`, {
        method: "PUT",
      });
    } catch (error) {
      console.error("Failed to mark conversation read", error);
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

      setLoadingMessages(true);
      try {
        const result = await apiRequest(
          `/chat/conversations/${conversation.Id}/messages?limit=100`,
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
        scrollToBottom();
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoadingMessages(false);
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
        const existing = prev.find((item) => item.Id === conversationId);
        const rest = prev.filter((item) => item.Id !== conversationId);
        const isSelected =
          Number(selectedConversationRef.current?.Id) ===
          Number(conversationId);

        const nextConversation = {
          ...(existing || {}),
          Id: conversationId,
          userOneId: existing?.userOneId,
          userTwoId: existing?.userTwoId,
          lastMessage: message,
          lastMessageId: message.Id,
          lastMessageAt: message.createdAt,
          otherUser,
          unreadCount:
            Number(message.receiverUserId) === currentUserId && !isSelected
              ? Number(existing?.unreadCount || 0) + 1
              : existing?.unreadCount || 0,
        };

        return [nextConversation, ...rest];
      });
    },
    [currentUserId],
  );

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    const timeout = setTimeout(loadUsers, 250);
    return () => clearTimeout(timeout);
  }, [loadUsers]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

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
    socket.on("connect_error", (error) => {
      setSocketConnected(false);
      console.error("Chat socket error", error.message);
    });

    socket.on("chat:message:new", async (payload) => {
      const conversationId = Number(payload?.conversationId);
      const message = payload?.message;
      if (!conversationId || !message) return;

      updateConversationFromMessage(conversationId, message);

      if (Number(selectedConversationRef.current?.Id) === conversationId) {
        setMessages((prev) => {
          if (prev.some((item) => Number(item.Id) === Number(message.Id))) {
            return prev;
          }
          return [...prev, message];
        });
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

    socket.on("chat:message:deleted", (payload) => {
      setMessages((prev) =>
        prev.filter(
          (message) => Number(message.Id) !== Number(payload.messageId),
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
    if (!text || !selectedUser || sending) return;

    setSending(true);
    setMessageText("");

    const payload = {
      receiverUserId: selectedUser.Id,
      message: text,
      messageType: "text",
    };

    try {
      const result = await apiRequest("/chat/messages", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const conversationId = result?.data?.conversationId;
      const message = result?.data?.message;

      if (conversationId && message) {
        setSelectedConversation((prev) => prev || { Id: conversationId });
        selectedConversationRef.current = { Id: conversationId };
        setMessages((prev) => {
          if (prev.some((item) => Number(item.Id) === Number(message.Id))) {
            return prev;
          }
          return [...prev, message];
        });
        updateConversationFromMessage(conversationId, message);
        socketRef.current?.emit("chat:conversation:join", { conversationId });
        scrollToBottom();
      }
    } catch (error) {
      setMessageText(text);
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  };

  const activeConversationTitle = useMemo(
    () => getDisplayName(selectedUser),
    [selectedUser],
  );

  if (!canUseChat) {
    return (
      <div className="min-h-dvh bg-slate-50 p-6 text-slate-900">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Chat</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your current role does not have chat access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50 p-4 text-slate-900 sm:p-6">
      <div className="mx-auto flex h-[calc(100dvh-48px)] max-w-7xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <aside
          className={`${
            selectedUser ? "hidden md:flex" : "flex"
          } w-full max-w-sm flex-col border-r border-slate-200 bg-slate-50 md:w-[360px]`}
        >
          <div className="border-b border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold">Messages</h1>
                <p className="text-xs text-slate-500">
                  {socketConnected ? "Real-time connected" : "Connecting..."}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <MessageCircle size={20} />
              </div>
            </div>

            <label className="mt-4 flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3">
              <Search size={17} className="text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder="Search people"
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="px-4 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Recent
            </div>
            {loadingConversations ? (
              <div className="px-4 py-3 text-sm text-slate-500">Loading...</div>
            ) : null}
            {conversations.map((conversation) => {
              const otherUser = conversation.otherUser;
              const active =
                Number(selectedConversation?.Id) === Number(conversation.Id);

              return (
                <button
                  key={conversation.Id}
                  type="button"
                  onClick={() => loadMessages(conversation, otherUser)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                    active ? "bg-indigo-50" : "hover:bg-white"
                  }`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-sm font-semibold text-slate-700">
                    {getInitials(otherUser)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {getDisplayName(otherUser)}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {getMessagePreview(conversation)}
                    </div>
                  </div>
                  {conversation.unreadCount > 0 ? (
                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
                      {conversation.unreadCount}
                    </span>
                  ) : null}
                </button>
              );
            })}

            <div className="px-4 pb-2 pt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              People
            </div>
            {loadingUsers ? (
              <div className="px-4 py-3 text-sm text-slate-500">Loading...</div>
            ) : null}
            {users.map((user) => (
              <button
                key={user.Id}
                type="button"
                onClick={() => openUserChat(user)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white ${
                  Number(selectedUser?.Id) === Number(user.Id)
                    ? "bg-indigo-50"
                    : ""
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
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
        </aside>

        <main
          className={`${
            selectedUser ? "flex" : "hidden md:flex"
          } min-w-0 flex-1 flex-col bg-white`}
        >
          {selectedUser ? (
            <>
              <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setSelectedConversation(null);
                    selectedConversationRef.current = null;
                    setMessages([]);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 md:hidden"
                  title="Back"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 font-semibold text-indigo-700">
                  {getInitials(selectedUser)}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-semibold">
                    {activeConversationTitle}
                  </div>
                  <div className="text-xs capitalize text-slate-500">
                    {selectedUser.role}
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-5 py-4">
                {loadingMessages ? (
                  <div className="text-sm text-slate-500">
                    Loading messages...
                  </div>
                ) : null}
                <div className="space-y-3">
                  {messages.map((message) => {
                    const mine = Number(message.senderUserId) === currentUserId;

                    return (
                      <div
                        key={message.Id}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[72%] rounded-lg px-4 py-2 text-sm shadow-sm ${
                            mine
                              ? "bg-indigo-600 text-white"
                              : "border border-slate-200 bg-white text-slate-800"
                          }`}
                        >
                          <div className="whitespace-pre-wrap break-words">
                            {message.message}
                          </div>
                          <div
                            className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
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
                className="flex items-center gap-3 border-t border-slate-200 bg-white p-4"
              >
                <input
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  className="h-12 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10"
                  placeholder="Type a message"
                />
                <button
                  type="submit"
                  disabled={sending || !messageText.trim()}
                  className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  title="Send"
                >
                  <Send size={18} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-slate-50 p-8">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
                  <UserRound size={28} />
                </div>
                <h2 className="mt-4 text-lg font-semibold">
                  Select someone to chat
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose a person from the left panel to start messaging.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ChatPage;
