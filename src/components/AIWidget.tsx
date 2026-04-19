/* eslint-disable @typescript-eslint/no-explicit-any, no-case-declarations, @typescript-eslint/no-unused-vars */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { X, Send, User, Mic, RotateCcw, Sparkles, ChevronDown, Zap, ArrowRight } from 'lucide-react';
import type { CarModel } from '../data';

interface AIWidgetProps {
  scrollToSection: (section: 'hero' | 'models' | 'comparison' | 'booking' | 'pricing' | 'contact') => void;
  setFilteredModels: React.Dispatch<React.SetStateAction<CarModel[]>>;
  setComparisonModels: React.Dispatch<React.SetStateAction<CarModel[]>>;
  setCurrency: React.Dispatch<React.SetStateAction<'INR' | 'USD'>>;
  setHighlightedModelId: React.Dispatch<React.SetStateAction<string | null>>;
  setBookingData: React.Dispatch<React.SetStateAction<{ model: string; date: string; city: string }>>;
  allCars: CarModel[];
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isError?: boolean;
}

type ModelProvider = 'groq' | 'gemini';
type ModelId = 'llama-3.3-70b-versatile' | 'llama-3.1-8b-instant' | 'gemini-2.5-flash' | 'gemini-2.5-flash-lite';

const MODEL_OPTIONS: { id: ModelId; label: string; provider: ModelProvider; badge?: string }[] = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', provider: 'groq', badge: 'Recommended' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', provider: 'groq', badge: 'Fast' },
  { id: 'gemini-2.5-flash', label: 'Gemini Flash', provider: 'gemini' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini Lite', provider: 'gemini' },
];

// Typewriter with markdown
const TypewriterText = ({ text, speed = 12 }: { text: string; speed?: number }) => {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const id = setInterval(() => {
      setDisplayed(text.slice(0, ++i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return <span>{renderMarkdown(displayed)}</span>;
};

// Markdown parser
function renderMarkdown(text: string) {
  return text.split(/(\*\*.*?\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

// Loading shimmer
const LoadingDots = () => (
  <div className="message message-ai" style={{ minWidth: 80 }}>
    <div className="flex items-center gap-sm" style={{ marginBottom: '0.5rem', opacity: 0.7, fontSize: '0.75rem' }}>
      <Zap size={12} color="var(--color-accent)" />
      <span>DriveAI</span>
    </div>
    <div className="flex gap-sm items-center" style={{ height: 20 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--color-accent)',
          animation: `dotBounce 1.4s infinite ease-in-out both`,
          animationDelay: `${i * 0.16}s`
        }} />
      ))}
    </div>
  </div>
);

export default function AIWidget({
  scrollToSection, setFilteredModels, setComparisonModels,
  setCurrency, setHighlightedModelId, setBookingData, allCars
}: AIWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelId>('llama-3.3-70b-versatile');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hi! I\'m **DriveAI** — your personal vehicle concierge. I can browse our fleet, compare specs, switch currencies, or book a test drive. What would you like to explore?', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [fabPulse, setFabPulse] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Dynamic suggestion chips based on conversation state
  const getSuggestions = useCallback(() => {
    const len = messages.length;
    if (len <= 2) return [
      { icon: '💰', text: 'Cars under 25 lakhs' },
      { icon: '🏆', text: 'Show the flagship model' },
      { icon: '⚡', text: 'Compare top two models' },
      { icon: '🗓️', text: 'Book a test drive' },
    ];
    const lastAI = messages.filter(m => m.role === 'model').pop()?.text.toLowerCase() || '';
    if (lastAI.includes('filter') || lastAI.includes('under'))
      return [
        { icon: '🔄', text: 'Show all cars' },
        { icon: '🏆', text: 'Show the best one' },
        { icon: '📊', text: 'Compare these models' },
      ];
    if (lastAI.includes('highlight') || lastAI.includes('apex') || lastAI.includes('hypercar'))
      return [
        { icon: '🗓️', text: 'Book a test drive for it' },
        { icon: '📊', text: 'Compare it with others' },
        { icon: '💵', text: 'Show price in USD' },
      ];
    if (lastAI.includes('compar'))
      return [
        { icon: '🗓️', text: 'Book the better one' },
        { icon: '💵', text: 'Switch to USD pricing' },
      ];
    return [
      { icon: '🔄', text: 'Show all cars' },
      { icon: '💵', text: 'Change currency to USD' },
      { icon: '🗓️', text: 'Book a test drive' },
    ];
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setFabPulse(false);
    }
  }, [isOpen]);

  // Keyboard shortcut: Ctrl+K to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Voice
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e: any) => setInput(e.results[0][0].transcript);
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── Tool Definitions ──
  const toolDefs = [
    {
      name: "scrollToSection",
      description: "Scrolls to a section: hero, models, comparison, booking, pricing, contact.",
      parameters: { type: "object", properties: { sectionId: { type: "string", enum: ["hero","models","comparison","booking","pricing","contact"] } }, required: ["sectionId"] }
    },
    {
      name: "filterModels",
      description: "Filters the car grid by budget (maxPriceLakhs) or type (SUV/Sedan/Coupe/Hypercar).",
      parameters: { type: "object", properties: { maxPriceLakhs: { type: "number" }, type: { type: "string" } }, required: [] }
    },
    {
      name: "compareModels",
      description: "Updates comparison table. Use exact names like 'Aether SUV', 'Nova Coupe'.",
      parameters: { type: "object", properties: { modelNames: { type: "array", items: { type: "string" } } }, required: ["modelNames"] }
    },
    {
      name: "prefillBooking",
      description: "Pre-fills test drive form with model name, date (YYYY-MM-DD), and city.",
      parameters: { type: "object", properties: { modelName: { type: "string" }, date: { type: "string" }, city: { type: "string" } }, required: [] }
    },
    {
      name: "changeCurrency",
      description: "Switches pricing to INR or USD.",
      parameters: { type: "object", properties: { currency: { type: "string", enum: ["INR","USD"] } }, required: ["currency"] }
    },
    {
      name: "highlightModel",
      description: "Highlights a specific car in the fleet grid. Automatically clears filters first. Use when recommending or showing a specific car.",
      parameters: { type: "object", properties: { modelName: { type: "string" } }, required: ["modelName"] }
    }
  ];

  // ── Tool Executor ──
  const executeTool = (name: string, args: any): string => {
    try {
      switch (name) {
        case 'scrollToSection':
          scrollToSection(args.sectionId);
          showToast(`Navigated to ${args.sectionId}`);
          return `Scrolled to ${args.sectionId}.`;
        case 'filterModels': {
          let f = [...allCars];
          if (args.maxPriceLakhs) f = f.filter(c => c.price <= args.maxPriceLakhs);
          if (args.type) f = f.filter(c => c.type.toLowerCase() === args.type.toLowerCase());
          setFilteredModels(f);
          scrollToSection('models');
          showToast(`Filtered: ${f.length} cars found`);
          return `Filtered to ${f.length} cars.`;
        }
        case 'compareModels': {
          const found = allCars.filter(c => args.modelNames.some((n: string) => c.name.toLowerCase().includes(n.toLowerCase())));
          if (found.length > 0) {
            setComparisonModels(found);
            scrollToSection('comparison');
            showToast('Comparison updated');
            return `Comparing: ${found.map(c => c.name).join(', ')}.`;
          }
          return 'Could not find those models.';
        }
        case 'prefillBooking':
          setBookingData(p => ({ model: args.modelName || p.model, date: args.date || p.date, city: args.city || p.city }));
          scrollToSection('booking');
          showToast('Booking form pre-filled');
          return `Pre-filled booking for ${args.modelName || 'car'}.`;
        case 'changeCurrency':
          if (args.currency === 'INR' || args.currency === 'USD') {
            setCurrency(args.currency);
            scrollToSection('pricing');
            showToast(`Currency → ${args.currency}`);
            return `Currency changed to ${args.currency}.`;
          }
          return 'Invalid currency.';
        case 'highlightModel': {
          flushSync(() => setFilteredModels([...allCars]));
          const m = allCars.find(c => c.name.toLowerCase().includes(args.modelName.toLowerCase()));
          if (m) {
            flushSync(() => setHighlightedModelId(m.id));
            scrollToSection('models');
            setTimeout(() => setHighlightedModelId(null), 5000);
            showToast(`Spotlighting ${m.name}`);
            return `Highlighted ${m.name}. Filters cleared.`;
          }
          return `Model "${args.modelName}" not found.`;
        }
        default: return 'Unknown tool.';
      }
    } catch { return 'Tool execution failed.'; }
  };

  // ── System Prompt ──
  const SYS_PROMPT = `You are DriveAI, the AI concierge for AeroMotors electric vehicles. You physically control the website UI via tools.

CATALOG:
- Aether SUV: Family, ₹18.5L, 450km range, 7.2s 0-100, 5 seats
- Zephyr Sedan: Executive, ₹22L, 520km range, 5.8s 0-100, 5 seats  
- Nova Coupe: Sporty, ₹35L, 480km range, 4.1s 0-100, 2 seats
- Apex Hypercar: Flagship, ₹120L, 600km range, 1.9s 0-100, 2 seats

RULES:
1. ALWAYS call a tool first, then explain what you did.
2. Use highlightModel when showing/recommending a specific car — it auto-clears filters.
3. Use exact car names: "Aether SUV", "Zephyr Sedan", "Nova Coupe", "Apex Hypercar".
4. Use **bold** for car names and key info in your response.
5. Keep responses under 3 sentences.`;

  // ── API Handlers ──
  const callGemini = async (userMsg: string, model: string): Promise<string> => {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key) throw new Error("VITE_GEMINI_API_KEY not set");

    const contents = messages.map(m => ({ role: m.role === 'model' ? 'model' : 'user', parts: [{ text: m.text }] }));
    contents.push({ role: 'user', parts: [{ text: userMsg }] });
    const tools = [{ functionDeclarations: toolDefs.map(t => ({ ...t, parameters: { ...t.parameters, type: "OBJECT" } })) }];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    const r1 = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: SYS_PROMPT }] }, contents, tools })
    });
    const d1 = await r1.json();
    if (d1.error) throw new Error(d1.error.message);

    const parts = d1.candidates?.[0]?.content?.parts;
    if (!parts) return "No response.";

    const tc = parts.find((p: any) => p.functionCall);
    if (tc) {
      const result = executeTool(tc.functionCall.name, tc.functionCall.args);
      const r2 = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: "Explain what you just did in 1-2 sentences. Use **bold**." }] },
          contents: [...contents, d1.candidates[0].content, { role: "user", parts: [{ functionResponse: { name: tc.functionCall.name, response: { result } } }] }]
        })
      });
      const d2 = await r2.json();
      return d2.candidates?.[0]?.content?.parts?.[0]?.text || result;
    }
    return parts.find((p: any) => p.text)?.text || "I'm not sure how to help with that.";
  };

  const callGroq = async (userMsg: string, model: string): Promise<string> => {
    const key = import.meta.env.VITE_GROQ_API_KEY;
    if (!key) throw new Error("VITE_GROQ_API_KEY not set");

    const msgs: any[] = [
      { role: "system", content: SYS_PROMPT },
      ...messages.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text })),
      { role: "user", content: userMsg }
    ];
    const tools = toolDefs.map(t => ({ type: "function" as const, function: t }));

    const r1 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: msgs, tools, tool_choice: "auto" })
    });
    const d1 = await r1.json();

    // Fallback: if tools fail, retry plain
    if (d1.error) {
      console.warn("Tool call failed, retrying plain:", d1.error.message);
      const fb = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: msgs })
      });
      const fbd = await fb.json();
      if (fbd.error) throw new Error(fbd.error.message);
      return fbd.choices?.[0]?.message?.content || "I'm not sure how to help.";
    }

    const msg = d1.choices[0].message;
    if (msg.tool_calls?.length > 0) {
      const results: any[] = [];
      for (const tc of msg.tool_calls) {
        let r = 'Tool execution failed.';
        try {
          const args = JSON.parse(tc.function.arguments || '{}');
          r = executeTool(tc.function.name, args);
        } catch (e) {
          console.error("Failed to parse tool arguments:", e);
        }
        results.push({ role: "tool", content: r, tool_call_id: tc.id });
      }
      try {
        const r2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: [...msgs, msg, ...results] })
        });
        const d2 = await r2.json();
        if (!d2.error) return d2.choices?.[0]?.message?.content || results.map(r => r.content).join(' ');
      } catch { /* fall through */ }
      return results.map(r => r.content).join(' ');
    }
    return msg.content || "I'm not sure how to help.";
  };

  // ── Send Handler ──
  const handleSend = async (forcedInput?: string) => {
    const text = (forcedInput || input).trim();
    if (!text || isLoading) return;
    setInput('');
    const userMsg: ChatMessage = { role: 'user', text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const provider = MODEL_OPTIONS.find(m => m.id === selectedModel)?.provider || 'groq';
      const response = provider === 'gemini'
        ? await callGemini(text, selectedModel)
        : await callGroq(text, selectedModel);
      setMessages(prev => [...prev, { role: 'model', text: response, timestamp: Date.now() }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'model', text: `Something went wrong: ${err.message}`, timestamp: Date.now(), isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'model', text: 'Chat reset! ✨ How can I help you navigate AeroMotors today?', timestamp: Date.now() }]);
    flushSync(() => setFilteredModels([...allCars]));
    setHighlightedModelId(null);
  };

  const currentModelLabel = MODEL_OPTIONS.find(m => m.id === selectedModel)?.label || selectedModel;

  // ── Render ──
  return (
    <div className="ai-widget-container">
      {/* Toast */}
      {toast && (
        <div className="ai-toast" style={{ animation: 'slideInUp 0.4s var(--ease-out-expo) forwards' }}>
          <Sparkles size={14} />
          {toast}
        </div>
      )}

      {/* Chat Window */}
      <div className={`ai-chat-window ${isOpen ? 'open' : 'closed'}`}>
        {/* Animated gradient border */}
        <div className="ai-gradient-border" />

        {/* Header */}
        <div className="ai-chat-header">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-sm">
              <div className="ai-avatar">
                <Zap size={16} />
              </div>
              <div>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>DriveAI</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-accent)', display: 'block', lineHeight: 1 }}>Online</span>
              </div>
            </div>
            <div className="flex gap-sm items-center">
              <button onClick={clearChat} title="Reset" className="ai-header-btn"><RotateCcw size={14} /></button>
              <button onClick={() => setIsOpen(false)} className="ai-header-btn"><X size={16} /></button>
            </div>
          </div>

          {/* Model Picker */}
          <button 
            className="ai-model-picker"
            onClick={() => setShowModelPicker(!showModelPicker)}
          >
            <Zap size={12} color="var(--color-accent)" />
            <span>{currentModelLabel}</span>
            <ChevronDown size={12} style={{ transform: showModelPicker ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
          </button>

          {showModelPicker && (
            <div className="ai-model-dropdown">
              {MODEL_OPTIONS.map(m => (
                <button
                  key={m.id}
                  className={`ai-model-option ${selectedModel === m.id ? 'active' : ''}`}
                  onClick={() => { setSelectedModel(m.id); setShowModelPicker(false); }}
                >
                  <span>{m.label}</span>
                  {m.badge && <span className="ai-model-badge">{m.badge}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="ai-chat-messages hide-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role === 'user' ? 'message-user' : 'message-ai'} ${msg.isError ? 'message-error' : ''}`}>
              <div className="flex items-center gap-sm" style={{ marginBottom: '0.4rem', opacity: 0.6, fontSize: '0.7rem' }}>
                {msg.role === 'user' ? <User size={11} /> : <Zap size={11} color="var(--color-accent)" />}
                <span>{msg.role === 'user' ? 'You' : 'DriveAI'}</span>
                <span style={{ marginLeft: 'auto' }}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {msg.role === 'model' && idx === messages.length - 1 && !msg.isError
                ? <TypewriterText text={msg.text} />
                : <span>{renderMarkdown(msg.text)}</span>
              }
              {msg.isError && (
                <button onClick={() => handleSend(messages.filter(m => m.role === 'user').pop()?.text)} className="ai-retry-btn">
                  <RotateCcw size={12} /> Retry
                </button>
              )}
            </div>
          ))}
          {isLoading && <LoadingDots />}
          <div ref={messagesEndRef} />
        </div>

        {/* Smart Suggestions */}
        {!isLoading && (
          <div className="ai-suggestions hide-scrollbar">
            {getSuggestions().map((s, i) => (
              <button key={i} className="ai-chip" onClick={() => handleSend(s.text)}>
                <span>{s.icon}</span>
                <span>{s.text}</span>
                <ArrowRight size={10} style={{ opacity: 0.4 }} />
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="ai-chat-input-area">
          <button className={`ai-mic-btn ${isListening ? 'listening' : ''}`} onClick={startListening} title="Voice">
            <Mic size={16} color={isListening ? '#000' : '#fff'} />
          </button>
          <input
            ref={inputRef}
            type="text"
            className="ai-chat-input"
            placeholder="Ask DriveAI anything..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button className="ai-chat-send" onClick={() => handleSend()} disabled={isLoading || !input.trim()}>
            <Send size={16} style={{ marginLeft: -1 }} />
          </button>
        </div>

        {/* Keyboard hint */}
        <div style={{ padding: '0 1rem 0.5rem', textAlign: 'center', fontSize: '0.65rem', color: '#444', letterSpacing: '0.05em' }}>
          Press <kbd style={{ background: '#222', padding: '1px 5px', borderRadius: 3, fontSize: '0.6rem' }}>Ctrl+K</kbd> to toggle
        </div>
      </div>

      {/* FAB */}
      {!isOpen && (
        <button className={`ai-fab ${fabPulse ? 'ai-fab-pulse' : ''}`} onClick={() => setIsOpen(true)} aria-label="Open AI Assistant">
          <Sparkles size={24} />
        </button>
      )}
    </div>
  );
}
