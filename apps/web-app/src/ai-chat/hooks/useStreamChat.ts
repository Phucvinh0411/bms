import { useState, useCallback, useRef } from 'react';
import { getAuthToken } from '@/src/api/client';

export type ChatMessageType = 'user' | 'assistant' | 'book_cards' | 'thinking';

export interface BookCard {
  id: number;
  title: string;
  author: string;
  price: number;
  imageUrl: string;
  categoryName: string;
  score: number;
}

export interface ChatMessage {
  id: string;
  type: ChatMessageType;
  content: string;
  bookCards?: BookCard[];
  timestamp: number;
}

const CHAT_API_URL = 'http://localhost/api/v1/products/api/v1/ai/chat/stream';

export function useStreamChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isStreaming) return;
    setError(null);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'user',
      content: userMessage.trim(),
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);

    const assistantId = crypto.randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      type: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, assistantMsg]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = getAuthToken();
      const response = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userMessage: userMessage.trim(),
          sessionId: sessionIdRef.current,
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEventType = 'text';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEventType = line.slice(6).trim();
            continue;
          }
          if (line.startsWith('data:')) {
            const data = line.slice(5);
            if (data === '[DONE]') continue;

            switch (currentEventType) {
              case 'text':
                setMessages(prev => prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: m.content + data }
                    : m
                ));
                break;
              case 'book_cards':
                try {
                  const books: BookCard[] = JSON.parse(data);
                  const bookMsg: ChatMessage = {
                    id: crypto.randomUUID(),
                    type: 'book_cards',
                    content: '',
                    bookCards: books,
                    timestamp: Date.now(),
                  };
                  setMessages(prev => {
                    const idx = prev.findIndex(m => m.id === assistantId);
                    if (idx === -1) return [...prev, bookMsg];
                    const next = [...prev];
                    next.splice(idx, 0, bookMsg);
                    return next;
                  });
                } catch { }
                break;
              case 'session':
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.sessionId) {
                    sessionIdRef.current = parsed.sessionId;
                  }
                } catch {}
                break;
              case 'error':
                try { setError(JSON.parse(data).error); } catch {}
                break;
            }
            currentEventType = 'text'; // Reset default
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Kết nối bị gián đoạn');
        setMessages(prev =>
          prev.filter(m => !(m.id === assistantId && !m.content))
        );
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [isStreaming]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    sessionIdRef.current = null;
  }, []);

  return { messages, isStreaming, error, sendMessage, stopStreaming, clearMessages };
}
