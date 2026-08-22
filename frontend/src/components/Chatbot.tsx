import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    text: 'Hello! I am your catalog data quality assistant. Ask me about enrichment pipeline stages, LOV validation rules, or precision metrics.',
    sender: 'bot',
    timestamp: new Date()
  }]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await apiFetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.text }),
      });
      const data = await response.json();
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: data.reply || 'Sorry, I could not process your request.',
        sender: 'bot',
        timestamp: new Date()
      };
      setTimeout(() => {
        setMessages(prev => [...prev, botMsg]);
        setIsTyping(false);
      }, 400);
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "Unable to reach the assistant service. Please ensure the backend is running.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Toggle Button (Balanced Medium Pill) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#0D0D0D] hover:bg-[#1A1A1A] text-white border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_22px_rgba(16,185,129,0.35)] z-50 transition-all cursor-pointer group active:scale-[0.98]"
          title="AI Quality Copilot - Ask anything"
        >
          <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Bot className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-left pr-1">
            <div className="text-xs font-bold text-white leading-tight font-heading">AI Quality Copilot</div>
            <div className="text-[10px] text-emerald-400 font-mono leading-tight">Ask anything</div>
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 h-[480px] max-h-[80vh] flex flex-col bg-[#0A0A0A] border border-white/15 rounded-2xl shadow-2xl z-50 overflow-hidden">
          
          {/* Chat Header */}
          <div className="flex items-center justify-between p-3.5 bg-black/60 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Catalog Assistant</h3>
                <p className="text-[10px] text-emerald-400 font-mono">Grounded Knowledge Active</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 font-sans">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-2 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                    msg.sender === 'user' 
                      ? 'bg-white/10 text-white' 
                      : 'bg-white/5 text-emerald-400'
                  }`}>
                    {msg.sender === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                  </div>
                  <div className={`px-3.5 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-white/15 text-white rounded-tr-none font-medium border border-white/10'
                      : 'bg-black/60 border border-white/5 text-slate-200 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex w-full justify-start">
                <div className="flex gap-2 max-w-[85%] flex-row">
                  <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center shrink-0 text-emerald-400">
                    <Bot className="w-3 h-3" />
                  </div>
                  <div className="px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/5 rounded-tl-none flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse delay-75"></div>
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse delay-150"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-2.5 border-t border-white/10 bg-black/60">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about pipeline stages or rules..."
                className="w-full bg-[#000000] border border-white/10 rounded-xl pl-3.5 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/30 transition-colors font-sans"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                className="absolute right-1.5 p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>

        </div>
      )}
    </>
  );
};

export default Chatbot;
