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
      {/* Floating Toggle Button (Larger, High Visibility with Glow) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/60 shadow-[0_0_30px_rgba(16,185,129,0.45)] z-50 transition-all transform hover:scale-105 active:scale-95 cursor-pointer group"
          title="Open AI Catalog Assistant"
        >
          <div className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-40 animate-ping"></span>
            <div className="w-8 h-8 rounded-xl bg-black/30 flex items-center justify-center">
              <Bot className="w-5 h-5 text-emerald-200" />
            </div>
          </div>
          <div className="text-left pr-1">
            <p className="text-xs font-bold font-heading text-white leading-none">AI Quality Copilot</p>
            <p className="text-[10px] text-emerald-200 font-mono mt-0.5 opacity-90">Ask anything</p>
          </div>
        </button>
      )}

      {/* Chat Window (Larger Dimensions & Clearer Typography) */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[360px] sm:w-[460px] md:w-[500px] h-[580px] max-h-[85vh] flex flex-col bg-[#0A0A0A] border border-emerald-500/30 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(16,185,129,0.15)] z-50 overflow-hidden">
          
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 bg-black/80 border-b border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-heading">Catalog Quality Copilot</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <p className="text-[11px] text-emerald-400 font-mono">11-Key Gemini Engine & LOV Active</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-sm">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-2.5 max-w-[88%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    msg.sender === 'user' 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-white/10 text-emerald-400 border border-white/10'
                  }`}>
                    {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-none font-medium shadow-sm'
                      : 'bg-[#141414] border border-white/10 text-slate-100 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex w-full justify-start">
                <div className="flex gap-2.5 max-w-[88%] flex-row items-center">
                  <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center shrink-0 text-emerald-400">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-[#141414] border border-white/10 rounded-tl-none flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse delay-100"></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse delay-200"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Suggestions */}
          {messages.length <= 2 && (
            <div className="px-4 py-2 border-t border-white/5 bg-black/40 flex items-center gap-2 overflow-x-auto no-scrollbar text-[11px] font-mono">
              {[
                "How does LOV validation work?",
                "What is manufacturer grounding?",
                "Explain the 6 UNILOG descriptions"
              ].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInputValue(prompt);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-white/10 transition-colors whitespace-nowrap cursor-pointer shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Chat Input */}
          <div className="p-3 border-t border-white/10 bg-black/80">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about pipeline stages, specs or rules..."
                className="w-full bg-[#111111] border border-white/15 focus:border-emerald-500/80 rounded-xl pl-4 pr-12 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-colors font-sans shadow-inner"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                className="absolute right-2 p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-white/10 text-white disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      )}

    </>
  );
};

export default Chatbot;
