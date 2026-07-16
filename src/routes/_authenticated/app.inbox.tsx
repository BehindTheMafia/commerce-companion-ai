import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useState, useMemo, useRef, useEffect, useCallback,
} from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  MessageSquare, Search, Filter, ChevronRight, Check, X,
  Send, Paperclip, Smile, Phone, Mail, MapPin,
  Clock, User, Package, Tag, FileText, Star,
  MoreHorizontal, Archive, CheckCheck, AlertCircle,
  Image, Mic, File, Download, Plus, Minus,
  ArrowUpRight, Sparkles, Bot, Zap, Settings2,
  RefreshCw, Inbox, CornerDownRight,
} from "lucide-react";
import {
  type InboxConversation, type InboxMessage, type FilterValue,
  FILTERS, formatTime, getTagColor,
  fetchConversations, fetchMessages, fetchNotes,
  sendMessage, resolveConversation, addNote, addTag, removeTag,
} from "@/lib/inbox";

export const Route = createFileRoute("/_authenticated/app/inbox")({
  component: InboxPage,
});

const CHANNEL_ICONS: Record<string, string> = {
  whatsapp: "WA",
  instagram: "IG",
  messenger: "FB",
  telegram: "TG",
  sms: "SMS",
  email: "@",
  web_chat: "W",
};

const STATUS_ICONS: Record<string, typeof Check> = {
  sent: Check,
  delivered: CheckCheck,
  read: CheckCheck,
  failed: AlertCircle,
};

const STATUS_COLORS: Record<string, string> = {
  sent: "text-muted-foreground",
  delivered: "text-muted-foreground",
  read: "text-blue-500",
  failed: "text-destructive",
};

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "bg-green-100 text-green-700",
  instagram: "bg-pink-100 text-pink-700",
  messenger: "bg-blue-100 text-blue-700",
  telegram: "bg-cyan-100 text-cyan-700",
  sms: "bg-gray-100 text-gray-700",
  email: "bg-purple-100 text-purple-700",
  web_chat: "bg-orange-100 text-orange-700",
};

const DEFAULT_TAGS = [
  "VIP", "Wholesale", "Retail", "Pending Payment",
  "Frequent Buyer", "Instagram", "WhatsApp", "Support", "Complaint",
];

const QUICK_REPLIES = [
  "Gracias por tu mensaje, en breve te atenderemos.",
  "¿Podrías confirmarme tu número de pedido?",
  "Claro, con gusto te ayudamos con eso.",
  "Te comparto el enlace de seguimiento de tu pedido.",
  "¿Hay algo más en lo que pueda ayudarte?",
];

function InboxPage() {
  const isMobile = useIsMobile();
  const { activeBusiness } = useBusiness();
  const [filter, setFilter] = useState<FilterValue>("all");
  const [search, setSearch] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [inputText, setInputText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [newNote, setNewNote] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const businessId = activeBusiness?.id;
  const selected = selectedConversationId;

  const { data: conversations = [], isLoading: convsLoading } = useQuery({
    queryKey: ["inbox-conversations", businessId, filter, search],
    enabled: !!businessId,
    queryFn: () => fetchConversations(businessId!, filter, search),
  });

  const { data: messages = [], isLoading: msgsLoading } = useQuery({
    queryKey: ["inbox-messages", selected],
    enabled: !!selected,
    queryFn: () => fetchMessages(selected!),
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["inbox-notes", selected],
    enabled: !!selected,
    queryFn: () => fetchNotes(selected!),
  });

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selected) ?? null,
    [conversations, selected],
  );

  const unreadTotal = useMemo(
    () => conversations.reduce((s, c) => s + c.unread_count, 0),
    [conversations],
  );

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selected) return;
      await sendMessage(selected, content);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox-messages", selected] });
      qc.invalidateQueries({ queryKey: ["inbox-conversations", businessId] });
      setInputText("");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Error al enviar"),
  });

  const resolveMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      await resolveConversation(selected);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox-conversations", businessId] });
      toast.success("Conversación resuelta");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Error"),
  });

  const noteMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selected) return;
      await addNote(selected, content);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox-notes", selected] });
      setNewNote("");
      toast.success("Nota agregada");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Error"),
  });

  const tagMutation = useMutation({
    mutationFn: async ({ tag, action }: { tag: string; action: "add" | "remove" }) => {
      if (!selected) return;
      if (action === "add") await addTag(selected, tag);
      else await removeTag(selected, tag);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox-conversations", businessId] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Error"),
  });

  function selectConversation(id: string) {
    setSelectedConversationId(id);
    setShowMobileChat(true);
  }

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!msgsLoading) scrollToBottom();
  }, [messages, msgsLoading, scrollToBottom]);

  useEffect(() => {
    if (!selected) return;
    const channel = supabase
      .channel("inbox-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "inbox_messages",
          filter: `conversation_id=eq.${selected}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["inbox-messages", selected] });
          qc.invalidateQueries({ queryKey: ["inbox-conversations", businessId] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "inbox_conversations",
          filter: `id=eq.${selected}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["inbox-conversations", businessId] });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selected, businessId, qc]);

  function onSend() {
    const text = inputText.trim();
    if (!text || sendMutation.isPending) return;
    sendMutation.mutate(text);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  const EMOJIS = ["😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","🥰","😘","😜","🤗","🤔","👍","👎","👊","✊","🤛","🤜","👏","🙌","💪","🤝","❤️","💙","💚","💛","🧡","💜","🖤","💝","💖","✨","🌟","⭐","🔥","💯","🎉","🎊","🎁","🎈","🚀","✅","❌","⚠️","♻️","📦","🛒","💰","🔔","📞","✉️","📍","📸","🎵","📄","🆘"];

  if (isMobile) {
    return (
      <div className="min-w-0 overflow-hidden px-4 py-4">
        <MobileInbox
          conversations={conversations}
          selectedConversation={selectedConversation}
          messages={messages}
          notes={notes}
          isLoading={convsLoading}
          filter={filter}
          search={search}
          unreadTotal={unreadTotal}
          showMobileChat={showMobileChat}
          showMobileFilters={showMobileFilters}
          showEmoji={showEmoji}
          showQuickReplies={showQuickReplies}
          showTags={showTags}
          inputText={inputText}
          newNote={newNote}
          selected={selected}
          onSelectConversation={selectConversation}
          onBack={() => { setShowMobileChat(false); }}
          onFilterChange={setFilter}
          onSearchChange={setSearch}
          onInputChange={setInputText}
          onSend={onSend}
          onKeyDown={onKeyDown}
          onResolve={() => resolveMutation.mutate()}
          onAddNote={(c) => noteMutation.mutate(c)}
          onNewNoteChange={setNewNote}
          onToggleEmoji={() => setShowEmoji(!showEmoji)}
          onInsertEmoji={(e) => setInputText(inputText + e)}
          onToggleQuickReplies={() => setShowQuickReplies(!showQuickReplies)}
          onToggleFilters={() => setShowMobileFilters(!showMobileFilters)}
          onToggleTags={() => setShowTags(!showTags)}
          onAddTag={(t) => tagMutation.mutate({ tag: t, action: "add" })}
          onRemoveTag={(t) => tagMutation.mutate({ tag: t, action: "remove" })}
          selectedTags={selectedConversation?.tags?.map((t) => t.tag) ?? []}
          messagesEndRef={messagesEndRef}
          isPending={sendMutation.isPending}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] min-w-0 overflow-hidden">
      <div className="flex w-[320px] shrink-0 flex-col border-r bg-background">
        <ConversationsPanel
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          unreadTotal={unreadTotal}
          filter={filter}
          search={search}
          isLoading={convsLoading}
          onFilterChange={setFilter}
          onSearchChange={setSearch}
          onSelect={selectConversation}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {selectedConversation ? (
          <ChatPanel
            conversation={selectedConversation}
            messages={messages}
            inputText={inputText}
            isPending={sendMutation.isPending}
            showEmoji={showEmoji}
            showQuickReplies={showQuickReplies}
            onInputChange={setInputText}
            onSend={onSend}
            onKeyDown={onKeyDown}
            onToggleEmoji={() => setShowEmoji(!showEmoji)}
            onInsertEmoji={(e) => setInputText(inputText + e)}
            onToggleQuickReplies={() => setShowQuickReplies(!showQuickReplies)}
            onResolve={() => resolveMutation.mutate()}
            messagesEndRef={messagesEndRef}
            loading={msgsLoading}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="grid size-16 place-items-center rounded-2xl bg-primary/5 text-primary">
                <MessageSquare className="size-8" />
              </div>
              <h3 className="text-lg font-semibold">Selecciona una conversación</h3>
              <p className="max-w-xs text-sm text-muted-foreground">
                Elige una conversación de la lista para empezar a chatear
              </p>
            </div>
          </div>
        )}
      </div>

      {selectedConversation && (
        <div className="flex w-[360px] shrink-0 flex-col border-l bg-background">
          <CustomerContextPanel
            conversation={selectedConversation}
            notes={notes}
            newNote={newNote}
            onNewNoteChange={setNewNote}
            onAddNote={(c) => noteMutation.mutate(c)}
            showTags={showTags}
            onToggleTags={() => setShowTags(!showTags)}
            selectedTags={selectedConversation?.tags?.map((t) => t.tag) ?? []}
            onAddTag={(t) => tagMutation.mutate({ tag: t, action: "add" })}
            onRemoveTag={(t) => tagMutation.mutate({ tag: t, action: "remove" })}
          />
        </div>
      )}
    </div>
  );
}

function ConversationsPanel({
  conversations, selectedConversationId, unreadTotal,
  filter, search, isLoading, onFilterChange, onSearchChange, onSelect,
}: {
  conversations: InboxConversation[];
  selectedConversationId: string | null;
  unreadTotal: number;
  filter: FilterValue;
  search: string;
  isLoading: boolean;
  onFilterChange: (v: FilterValue) => void;
  onSearchChange: (v: string) => void;
  onSelect: (id: string) => void;
}) {
  const [showFilters, setShowFilters] = useState(false);
  return (
    <>
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Bandeja de entrada</h2>
          {unreadTotal > 0 && (
            <Badge variant="secondary" className="size-5 rounded-full p-0 text-[10px] leading-none">
              {unreadTotal > 99 ? "99+" : unreadTotal}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="size-3.5" />
        </Button>
      </div>

      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar conversaciones..."
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-1 px-4 pb-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilterChange(f.value)}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-medium transition-colors ${
                filter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="size-10 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-2.5 w-48 animate-pulse rounded bg-muted/60" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <Inbox className="size-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">No hay conversaciones</p>
          </div>
        ) : (
          <div className="divide-y">
            {conversations.map((conv) => {
              const isSelected = conv.id === selectedConversationId;
              const convTags = conv.tags?.map((t) => t.tag) ?? [];
              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 ${
                    isSelected ? "bg-accent" : ""
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar className="size-10">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {conv.customer_name?.charAt(0)?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[8px] font-bold text-white ${CHANNEL_COLORS[conv.channel]?.split(" ")[0] ?? "bg-muted"}`}>
                      {CHANNEL_ICONS[conv.channel] ?? "?"}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {conv.customer_name ?? conv.customer_phone ?? "Desconocido"}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {conv.last_message_at ? formatTime(conv.last_message_at) : ""}
                      </span>
                    </div>
                    <p className={`mt-0.5 truncate text-xs ${
                      conv.unread_count > 0 ? "font-medium text-foreground" : "text-muted-foreground"
                    }`}>
                      {conv.last_message_text ?? "Sin mensajes"}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {conv.unread_count > 0 && (
                        <Badge variant="default" className="h-4 rounded px-1 text-[9px] leading-none">
                          {conv.unread_count}
                        </Badge>
                      )}
                      {convTags.slice(0, 2).map((t) => (
                        <span key={t} className={`rounded px-1 py-[1px] text-[8px] font-medium ${getTagColor(t)}`}>
                          {t}
                        </span>
                      ))}
                      {conv.status !== "open" && (
                        <span className="rounded bg-muted px-1 py-[1px] text-[8px] font-medium text-muted-foreground">
                          {conv.status}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </>
  );
}

function ChatPanel({
  conversation, messages, inputText, isPending,
  showEmoji, showQuickReplies,
  onInputChange, onSend, onKeyDown,
  onToggleEmoji, onInsertEmoji, onToggleQuickReplies,
  onResolve, messagesEndRef, loading,
}: {
  conversation: InboxConversation;
  messages: InboxMessage[];
  inputText: string;
  isPending: boolean;
  showEmoji: boolean;
  showQuickReplies: boolean;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onToggleEmoji: () => void;
  onInsertEmoji: (e: string) => void;
  onToggleQuickReplies: () => void;
  onResolve: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  loading: boolean;
}) {
  const convTags = conversation.tags?.map((t) => t.tag) ?? [];

  return (
    <>
      <div className="flex items-center justify-between border-b px-5 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="size-9">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {conversation.customer_name?.charAt(0)?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold">
                {conversation.customer_name ?? conversation.customer_phone ?? "Desconocido"}
              </h3>
              {conversation.ai?.urgency && (
                <Badge variant={conversation.ai.urgency === "critical" ? "destructive" : "secondary"} className="h-4 rounded px-1 text-[9px] leading-none">
                  {conversation.ai.urgency}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="font-medium">{conversation.customer_phone ?? ""}</span>
              {convTags.length > 0 && (
                <>
                  <span>·</span>
                  {convTags.map((t) => (
                    <span key={t} className={`rounded px-1 py-[1px] ${getTagColor(t)}`}>{t}</span>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-7" onClick={onResolve} title="Resolver">
            <Check className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7" title="Más opciones">
            <MoreHorizontal className="size-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-5 py-4">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}>
                <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className={`space-y-1.5 ${i % 2 === 0 ? "" : "items-end flex flex-col"}`}>
                  <div className={`h-8 animate-pulse rounded-lg bg-muted ${i % 2 === 0 ? "w-48" : "w-36"}`} />
                  <div className={`h-4 w-16 animate-pulse rounded bg-muted/60`} />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <MessageSquare className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No hay mensajes todavía</p>
            <p className="text-xs text-muted-foreground/60">Escribe el primer mensaje para iniciar la conversación</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...messages].reverse().map((msg) => {
              const isCustomer = msg.sender_type === "customer";
              const isSystem = msg.sender_type === "system";
              const StatusIcon = STATUS_ICONS[msg.status] || Check;
              const statusColor = STATUS_COLORS[msg.status] || "text-muted-foreground";

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <span className="rounded-full bg-muted px-3 py-1 text-[10px] text-muted-foreground">
                      {msg.content}
                    </span>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex gap-3 ${isCustomer ? "" : "flex-row-reverse"}`}>
                  <Avatar className="size-8 shrink-0">
                    <AvatarFallback className={`text-[10px] ${isCustomer ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {isCustomer
                        ? (conversation.customer_name?.charAt(0)?.toUpperCase() ?? "C")
                        : "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[70%] ${!isCustomer ? "items-end flex flex-col" : ""}`}>
                    <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isCustomer
                        ? "rounded-bl-sm bg-muted"
                        : "rounded-br-sm bg-primary text-primary-foreground"
                    }`}>
                      {msg.message_type === "image" ? (
                        <div className="space-y-2">
                          {msg.media_url && (
                            <img src={msg.media_url} alt="" className="max-w-full rounded-lg object-cover" />
                          )}
                          {msg.content && <p>{msg.content}</p>}
                        </div>
                      ) : msg.message_type === "document" ? (
                        <div className="flex items-center gap-2">
                          <File className="size-4 shrink-0" />
                          <span className="truncate text-sm">{msg.content ?? "Documento"}</span>
                        </div>
                      ) : msg.message_type === "location" ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4 shrink-0" />
                          <span className="text-sm">{msg.content ?? "Ubicación"}</span>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      )}
                    </div>
                    <div className={`mt-0.5 flex items-center gap-1 px-1 ${!isCustomer ? "flex-row-reverse" : ""}`}>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(msg.created_at), "HH:mm")}
                      </span>
                      {!isCustomer && (
                        <StatusIcon className={`size-3 ${statusColor}`} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {showQuickReplies && (
        <div className="border-t px-5 py-3">
          <div className="mb-2 flex items-center gap-2">
            <Bot className="size-3.5 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground">Respuestas rápidas</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REPLIES.map((reply) => (
              <button
                key={reply}
                onClick={() => onInputChange(reply)}
                className="rounded-lg border bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {reply}
              </button>
            ))}
          </div>
        </div>
      )}

      {showEmoji && (
        <div className="border-t px-5 py-3">
          <div className="flex flex-wrap gap-1">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onInsertEmoji(emoji)}
                className="flex size-7 items-center justify-center rounded-md text-base transition-colors hover:bg-accent"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t px-5 py-3">
        <div className="flex items-end gap-2">
          <div className="flex items-center gap-1 pb-1">
            <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" onClick={onToggleEmoji} title="Emojis">
              <Smile className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" title="Adjuntar">
              <Paperclip className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" title="Plantillas">
              <FileText className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" onClick={onToggleQuickReplies} title="Respuestas rápidas">
              <Zap className="size-4" />
            </Button>
          </div>
          <div className="relative flex-1">
            <Input
              value={inputText}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Escribe un mensaje..."
              className="h-10 pr-10 resize-none"
            />
            <Button
              size="icon"
              className="absolute right-0.5 top-0.5 size-9"
              onClick={onSend}
              disabled={!inputText.trim() || isPending}
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function CustomerContextPanel({
  conversation, notes, newNote, onNewNoteChange, onAddNote,
  showTags, onToggleTags, selectedTags, onAddTag, onRemoveTag,
}: {
  conversation: InboxConversation;
  notes: any[];
  newNote: string;
  onNewNoteChange: (v: string) => void;
  onAddNote: (c: string) => void;
  showTags: boolean;
  onToggleTags: () => void;
  selectedTags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}) {
  const customer = conversation.customer;
  const ai = conversation.ai;
  const totalSpent = customer ? 0 : 0;
  const customerSince = (customer as any)?.created_at ?? conversation.created_at;

  return (
    <ScrollArea className="flex-1">
      <div className="px-5 py-4">
        <div className="flex flex-col items-center gap-2 pb-4 text-center">
          <Avatar className="size-14">
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {customer?.full_name?.charAt(0)?.toUpperCase() ?? conversation.customer_name?.charAt(0)?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-base font-semibold">{customer?.full_name ?? conversation.customer_name ?? "Desconocido"}</h3>
            {conversation.customer_phone && (
              <p className="text-xs text-muted-foreground">{conversation.customer_phone}</p>
            )}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/50 px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground">Desde</p>
            <p className="text-xs font-medium">{format(new Date(customerSince), "MMM yyyy")}</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground">Gasto total</p>
            <p className="text-xs font-medium">$0.00</p>
          </div>
        </div>

        <Separator className="mb-4" />

        {customer && (
          <>
            <div className="mb-4 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contacto</h4>
              {customer.email && (
                <div className="flex items-center gap-2 text-xs">
                  <Mail className="size-3 text-muted-foreground" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2 text-xs">
                  <Phone className="size-3 text-muted-foreground" />
                  <span>{customer.phone}</span>
                </div>
              )}
            </div>
            <Separator className="mb-4" />
          </>
        )}

        <div className="mb-4">
          <button onClick={onToggleTags} className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 hover:text-foreground">
            <Tag className="size-3" />
            Tags
            {selectedTags.length > 0 && (
              <Badge variant="secondary" className="h-4 rounded px-1 text-[9px] leading-none">{selectedTags.length}</Badge>
            )}
          </button>
          <div className="flex flex-wrap gap-1">
            {selectedTags.map((t) => (
              <span key={t} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${getTagColor(t)}`}>
                {t}
                <button onClick={() => onRemoveTag(t)} className="hover:text-foreground/60">
                  <X className="size-2.5" />
                </button>
              </span>
            ))}
          </div>
          {showTags && (
            <div className="mt-2 flex flex-wrap gap-1">
              {DEFAULT_TAGS.filter((t) => !selectedTags.includes(t)).map((t) => (
                <button
                  key={t}
                  onClick={() => onAddTag(t)}
                  className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors hover:opacity-80 ${getTagColor(t)}`}
                >
                  + {t}
                </button>
              ))}
            </div>
          )}
        </div>

        <Separator className="mb-4" />

        {ai && (ai.summary || ai.sentiment || ai.suggested_reply) && (
          <>
            <div className="mb-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                <Sparkles className="size-3" />
                Resumen IA
              </div>
              {ai.summary && (
                <p className="mb-2 text-xs leading-relaxed text-muted-foreground">{ai.summary}</p>
              )}
              {ai.sentiment && (
                <Badge variant="secondary" className="mb-1 text-[9px]">{ai.sentiment}</Badge>
              )}
              {ai.suggested_reply && (
                <div className="rounded-lg border bg-muted/30 p-2.5">
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">Respuesta sugerida:</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{ai.suggested_reply}</p>
                </div>
              )}
            </div>
            <Separator className="mb-4" />
          </>
        )}

        <div className="mb-4">
          <h4 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            <Package className="size-3" />
            Últimos pedidos
          </h4>
          <div className="rounded-lg border bg-muted/30 p-4 text-center">
            <p className="text-[10px] text-muted-foreground">Sin pedidos registrados</p>
          </div>
        </div>

        <Separator className="mb-4" />

        <div className="mb-4">
          <h4 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            <FileText className="size-3" />
            Notas internas
          </h4>
          <div className="mb-2 space-y-2">
            {notes.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">Sin notas</p>
            ) : (
              notes.map((note: any) => (
                <div key={note.id} className="rounded-lg bg-muted/50 p-2.5">
                  <p className="text-xs leading-relaxed">{note.content}</p>
                  <p className="mt-1 text-[9px] text-muted-foreground">
                    {format(new Date(note.created_at), "dd MMM HH:mm")}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Textarea
              value={newNote}
              onChange={(e) => onNewNoteChange(e.target.value)}
              placeholder="Agregar nota interna..."
              className="min-h-[60px] resize-none text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 self-end"
              onClick={() => onAddNote(newNote)}
              disabled={!newNote.trim()}
            >
              <Plus className="size-3" />
            </Button>
          </div>
        </div>

        <Separator className="mb-4" />

        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Acciones rápidas</h4>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs">
            <Package className="size-3.5" /> Crear pedido
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs">
            <User className="size-3.5" /> Ver cliente
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs">
            <Archive className="size-3.5" /> Archivar conversación
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}

function MobileInbox({
  conversations, selectedConversation, messages, notes,
  isLoading, filter, search, unreadTotal,
  showMobileChat, showMobileFilters, showEmoji, showQuickReplies, showTags,
  inputText, newNote, selected,
  onSelectConversation, onBack, onFilterChange, onSearchChange,
  onInputChange, onSend, onKeyDown, onResolve,
  onAddNote, onNewNoteChange,
  onToggleEmoji, onInsertEmoji, onToggleQuickReplies, onToggleFilters, onToggleTags,
  onAddTag, onRemoveTag, selectedTags, messagesEndRef, isPending,
}: {
  conversations: InboxConversation[];
  selectedConversation: InboxConversation | null;
  messages: InboxMessage[];
  notes: any[];
  isLoading: boolean;
  filter: FilterValue;
  search: string;
  unreadTotal: number;
  showMobileChat: boolean;
  showMobileFilters: boolean;
  showEmoji: boolean;
  showQuickReplies: boolean;
  showTags: boolean;
  inputText: string;
  newNote: string;
  selected: string | null;
  onSelectConversation: (id: string) => void;
  onBack: () => void;
  onFilterChange: (v: FilterValue) => void;
  onSearchChange: (v: string) => void;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onResolve: () => void;
  onAddNote: (c: string) => void;
  onNewNoteChange: (v: string) => void;
  onToggleEmoji: () => void;
  onInsertEmoji: (e: string) => void;
  onToggleQuickReplies: () => void;
  onToggleFilters: () => void;
  onToggleTags: () => void;
  onAddTag: (t: string) => void;
  onRemoveTag: (t: string) => void;
  selectedTags: string[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  isPending: boolean;
}) {
  if (showMobileChat && selectedConversation) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={onBack}>
            <ChevronRight className="size-4 rotate-180" />
          </Button>
          <Avatar className="size-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {selectedConversation.customer_name?.charAt(0)?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{selectedConversation.customer_name ?? selectedConversation.customer_phone}</p>
          </div>
          <Button variant="ghost" size="icon" className="size-8" onClick={onResolve}>
            <Check className="size-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 px-4 py-3">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">Sin mensajes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...messages].reverse().map((msg) => {
                const isCustomer = msg.sender_type === "customer";
                const isSystem = msg.sender_type === "system";

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <span className="rounded-full bg-muted px-3 py-1 text-[10px] text-muted-foreground">{msg.content}</span>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex gap-2 ${isCustomer ? "" : "flex-row-reverse"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      isCustomer ? "rounded-bl-sm bg-muted" : "rounded-br-sm bg-primary text-primary-foreground"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <div className="border-t px-4 py-3">
          {showEmoji && (
            <div className="mb-2 flex flex-wrap gap-1">
              {EMOJIS.map((emoji) => (
                <button key={emoji} onClick={() => onInsertEmoji(emoji)} className="flex size-7 items-center justify-center rounded-md text-base hover:bg-accent">{emoji}</button>
              ))}
            </div>
          )}
          {showQuickReplies && (
            <div className="mb-2 space-y-1">
              {QUICK_REPLIES.map((reply) => (
                <button key={reply} onClick={() => onInputChange(reply)} className="block w-full rounded-lg border bg-background px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent">{reply}</button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <div className="flex items-center gap-1 pb-1">
              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={onToggleEmoji}>
                <Smile className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={onToggleQuickReplies}>
                <Zap className="size-4" />
              </Button>
            </div>
            <div className="relative flex-1">
              <Input value={inputText} onChange={(e) => onInputChange(e.target.value)} onKeyDown={onKeyDown} placeholder="Mensaje..." className="h-10 pr-10" />
              <Button size="icon" className="absolute right-0.5 top-0.5 size-9" onClick={onSend} disabled={!inputText.trim() || isPending}>
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Inbox</h1>
        <Button variant="ghost" size="icon" className="size-8" onClick={onToggleFilters}>
          <Filter className="size-4" />
        </Button>
      </div>

      {showMobileFilters && (
        <div className="mt-3 flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilterChange(f.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
        <Input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Buscar..." className="w-full pl-9" />
      </div>

      <Card className="mt-4 overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="size-10 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-2.5 w-48 animate-pulse rounded bg-muted/60" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <MessageSquare className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No hay conversaciones</p>
          </div>
        ) : (
          <div className="divide-y">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50"
                onClick={() => onSelectConversation(conv.id)}
              >
                <Avatar className="size-10">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {conv.customer_name?.charAt(0)?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{conv.customer_name ?? conv.customer_phone ?? "Desconocido"}</span>
                    {conv.unread_count > 0 && (
                      <Badge variant="default" className="h-4 rounded px-1 text-[9px] leading-none">{conv.unread_count}</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{conv.last_message_text ?? "Sin mensajes"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

const EMOJIS = ["😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","🥰","😘","😜","🤗","🤔","👍","👎","👊","✊","🤛","🤜","👏","🙌","💪","🤝","❤️","💙","💚","💛","🧡","💜","🖤","💝","💖","✨","🌟","⭐","🔥","💯","🎉","🎊","🎁","🎈","🚀","✅","❌","⚠️","♻️","📦","🛒","💰","🔔","📞","✉️","📍","📸","🎵","📄","🆘"];
