"use client"

import { useMemo, useState, FormEvent, KeyboardEvent } from "react"
import { Bot, Paperclip, Mic, CornerDownLeft } from "lucide-react"
import { useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
} from "@/components/ui/chat-bubble"
import { ChatInput } from "@/components/ui/chat-input"
import {
  ExpandableChat,
  ExpandableChatHeader,
  ExpandableChatBody,
  ExpandableChatFooter,
} from "@/components/ui/expandable-chat"
import { ChatMessageList } from "@/components/ui/chat-message-list"
import { chatApi } from "@/lib/api"
import { useWorkerAuthStore } from "@/stores/workerAuthStore"
import { useAdminAuthStore } from "@/stores/adminAuthStore"

interface ChatMessage {
  id: number
  content: string
  sender: "ai" | "user"
}

export function ExpandableChatDemo() {
  const location = useLocation()
  const worker = useWorkerAuthStore((state) => state.worker)
  const admin = useAdminAuthStore((state) => state.admin)
  const role = useMemo<"worker" | "admin" | "super_admin" | "guest">(() => {
    if (admin?.role === "super_admin") return "super_admin"
    if (admin?.role === "admin") return "admin"
    if (worker) return "worker"
    return "guest"
  }, [admin, worker])

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      content: "Hi. Ask me about policies, claims, payouts, onboarding, or risk signals in GigShield.",
      sender: "ai",
    },
  ])

  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = async () => {
    const trimmedInput = input.trim()
    if (!trimmedInput || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now(),
      content: trimmedInput,
      sender: "user",
    }

    setMessages((prev) => [
      ...prev,
      userMessage,
    ])
    setInput("")
    setIsLoading(true)

    try {
      const result = await chatApi.sendMessage({
        message: trimmedInput,
        context: {
          role,
          page: location.pathname,
        },
      })

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          content: result.data.reply,
          sender: "ai",
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          content: "Chat is unavailable right now. Try again in a moment.",
          sender: "ai",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await sendMessage()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void sendMessage()
    }
  }

  const handleAttachFile = () => {
    //
  }

  const handleMicrophoneClick = () => {
    //
  }

  return (
    <div className="h-[600px] relative">
      <ExpandableChat
        size="lg"
        position="bottom-right"
        icon={<Bot className="h-6 w-6" />}
      >
        <ExpandableChatHeader className="flex-col text-center justify-center">
          <h1 className="text-xl font-semibold">How can I help you today?</h1>
        </ExpandableChatHeader>

        <ExpandableChatBody>
          <ChatMessageList>
            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                variant={message.sender === "user" ? "sent" : "received"}
              >
                <ChatBubbleAvatar
                  className="h-8 w-8 shrink-0"
                  src={
                    message.sender === "user"
                      ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&q=80&crop=faces&fit=crop"
                      : "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&q=80&crop=faces&fit=crop"
                  }
                  fallback={message.sender === "user" ? "US" : "AI"}
                />
                <ChatBubbleMessage
                  variant={message.sender === "user" ? "sent" : "received"}
                >
                  {message.content}
                </ChatBubbleMessage>
              </ChatBubble>
            ))}

            {isLoading && (
              <ChatBubble variant="received">
                <ChatBubbleAvatar
                  className="h-8 w-8 shrink-0"
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&q=80&crop=faces&fit=crop"
                  fallback="AI"
                />
                <ChatBubbleMessage isLoading />
              </ChatBubble>
            )}
          </ChatMessageList>
        </ExpandableChatBody>

        <ExpandableChatFooter>
          <form
            onSubmit={handleSubmit}
            className="relative rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring p-1"
          >
            <ChatInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="min-h-12 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0"
            />
            <div className="flex items-center p-3 pt-0 justify-between">
              <div className="flex">
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={handleAttachFile}
                >
                  <Paperclip className="size-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={handleMicrophoneClick}
                >
                  <Mic className="size-4" />
                </Button>
              </div>
              <Button type="submit" size="sm" className="ml-auto gap-1.5">
                Send Message
                <CornerDownLeft className="size-3.5" />
              </Button>
            </div>
          </form>
        </ExpandableChatFooter>
      </ExpandableChat>
    </div>
  )
}
