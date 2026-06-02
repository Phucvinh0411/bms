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

const productApiBase = process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL || 'http://localhost/api/v1/products';
const CHAT_API_URL = `${productApiBase}/api/v1/ai/chat/stream`;

export function useStreamChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isStreaming) return;
    setError(null);

    // 1. Thêm tin nhắn của User vào UI ngay lập tức
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'user',
      content: userMessage.trim(),
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);

    // 2. Tạo placeholder cho câu thoại Assistant
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          // Bỏ qua dòng trống, dòng keep-alive, dòng comment của SSE
          if (!line.trim() || line.startsWith(':')) continue;

          let rawData = line;
          if (line.startsWith('data:')) {
            rawData = line.slice(5); // Giữ nguyên khoảng trống đầu và cuối của token thô
          }

          if (rawData === '[DONE]') continue;

          // Phân tích Prefix dựa trên 2 ký tự đầu (0:, 2:, 3:, 8:, e:)
          const prefix = rawData.slice(0, 2);
          const payload = rawData.slice(2);

          switch (prefix) {
            case '0:':
              // 0: Văn bản thường -> Cộng dồn vào nội dung AI chat
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: m.content + payload }
                  : m
              ));
              break;

            case '1:':
              // 1: Trạng thái đang suy nghĩ (Thinking stream status) -> Đưa vào một tin nhắn type 'thinking' riêng biệt
              setMessages(prev => {
                const existingThinkingIdx = prev.findIndex(m => m.type === 'thinking');
                if (existingThinkingIdx !== -1) {
                  // Cập nhật trạng thái suy nghĩ hiện tại
                  const next = [...prev];
                  next[existingThinkingIdx] = {
                    ...next[existingThinkingIdx],
                    content: payload
                  };
                  return next;
                } else {
                  // Tạo mới một thinking message và chèn TRƯỚC assistant placeholder
                  const thinkingMsg: ChatMessage = {
                    id: 'thinking-placeholder',
                    type: 'thinking',
                    content: payload,
                    timestamp: Date.now()
                  };
                  const assistantIdx = prev.findIndex(m => m.id === assistantId);
                  if (assistantIdx === -1) return [...prev, thinkingMsg];
                  const next = [...prev];
                  next.splice(assistantIdx, 0, thinkingMsg);
                  return next;
                }
              });
              break;

            case '2:':
              // 2: Thiết lập Session ID
              try {
                const parsed = JSON.parse(payload);
                if (parsed.sessionId) {
                  sessionIdRef.current = parsed.sessionId;
                }
              } catch (err) {
                console.error("Lỗi phân tích session ID:", err);
              }
              break;

            case '3:':
              // 3: Hiển thị lỗi hệ thống
              try {
                const parsed = JSON.parse(payload);
                if (parsed.error) {
                  setError(parsed.error);
                }
              } catch {
                setError(payload);
              }
              break;

            case '8:':
              // 8: Dữ liệu sách Generative UI (JSON Array) -> Chèn Card sách vào cuộc hội thoại
              try {
                const books: BookCard[] = JSON.parse(payload);
                const bookMsg: ChatMessage = {
                  id: crypto.randomUUID(),
                  type: 'book_cards',
                  content: '',
                  bookCards: books,
                  timestamp: Date.now(),
                };

                // Chèn Card sách lên phía trước tin nhắn AI đang trả lời
                setMessages(prev => {
                  const idx = prev.findIndex(m => m.id === assistantId);
                  if (idx === -1) return [...prev, bookMsg];
                  const next = [...prev];
                  next.splice(idx, 0, bookMsg);
                  return next;
                });
              } catch (err) {
                console.error("Lỗi phân tích JSON Card sách:", err);
              }
              break;

            case 'e:':
              // e: Kết thúc stream -> Ẩn hoặc xóa bỏ tin nhắn thinking status, in ra thời gian chạy thực tế
              setMessages(prev => prev.filter(m => m.type !== 'thinking'));
              try {
                const metadata = JSON.parse(payload);
                console.log("AI RAG Stream hoàn tất trong:", metadata.tookSeconds, "giây. FinishReason:", metadata.finishReason);
              } catch {}
              break;

            default:
              // Fallback cho dòng không có prefix hợp lệ
              if (rawData.trim()) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: m.content + rawData }
                    : m
                ));
              }
              break;
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Kết nối bị gián đoạn');
        // Thu hồi placeholder tin nhắn trống nếu chưa sinh chữ
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
