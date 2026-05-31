'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Square, Trash2 } from 'lucide-react';
import { useStreamChat, ChatMessage } from '../hooks/useStreamChat';
import { BookSuggestionCard } from './BookSuggestionCard';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, isStreaming, error, sendMessage, stopStreaming, clearMessages } = useStreamChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <>
      {/* ─── Floating Button ─── */}
      {!isOpen && (
        <button
          id="ai-chat-toggle"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full
                     bg-blue-600 hover:bg-blue-500 text-white
                     shadow-lg shadow-blue-600/25 transition-all duration-300
                     hover:scale-110 flex items-center justify-center"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* ─── Chat Panel ─── */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[600px] max-h-[85vh] max-w-[90vw]
                        bg-slate-950 border border-slate-700/50 rounded-2xl
                        shadow-2xl shadow-black/50 flex flex-col overflow-hidden
                        animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3
                          border-b border-slate-800 bg-slate-900/80 backdrop-blur">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-semibold text-slate-100">BookHaven AI</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={clearMessages}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400
                                 hover:text-slate-200 transition-colors"
                      title="Xóa hội thoại">
                <Trash2 size={16} />
              </button>
              <button onClick={() => setIsOpen(false)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400
                                 hover:text-slate-200 transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3
                          scrollbar-thin scrollbar-thumb-slate-700">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <MessageCircle size={40} className="mb-3 opacity-30" />
                <p className="text-sm">Xin chào! Tôi có thể giúp bạn tìm sách.</p>
              </div>
            )}

            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Error toast */}
            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-950/50 border border-red-800/50
                              text-red-300 text-xs">
                ⚠ {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit}
                className="px-4 py-3 border-t border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Hỏi về sách, đơn hàng..."
                disabled={isStreaming}
                className="flex-1 px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700
                           text-sm text-slate-100 placeholder:text-slate-500
                           focus:outline-none focus:ring-2 focus:ring-blue-500/50
                           focus:border-blue-500/50 disabled:opacity-50
                           transition-all"
              />
              {isStreaming ? (
                <button type="button" onClick={stopStreaming}
                        className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500
                                   text-white transition-colors">
                  <Square size={16} />
                </button>
              ) : (
                <button type="submit" disabled={!input.trim()}
                        className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500
                                   disabled:bg-slate-700 disabled:text-slate-500
                                   text-white transition-colors">
                  <Send size={16} />
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.type === 'book_cards' && message.bookCards) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs text-slate-500 px-1">📚 Gợi ý sách cho bạn:</span>
        {message.bookCards.map(book => (
          <BookSuggestionCard key={book.id} book={book} />
        ))}
      </div>
    );
  }

  if (message.type === 'thinking') {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500 italic">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        {message.content}
      </div>
    );
  }

  const isUser = message.type === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words
                       ${isUser
                         ? 'bg-blue-600 text-white rounded-br-md'
                         : 'bg-slate-800 text-slate-200 rounded-bl-md border border-slate-700/50'}
                       ${!message.content && !isUser ? 'animate-pulse' : ''}`}>
        {message.content || (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:0.15s]" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:0.3s]" />
          </div>
        )}
      </div>
    </div>
  );
}
