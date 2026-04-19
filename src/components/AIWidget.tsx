/* eslint-disable @typescript-eslint/no-explicit-any, no-case-declarations, @typescript-eslint/no-unused-vars */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { X, Send, User, Mic, RotateCcw, Sparkles, ChevronDown, Zap, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import type { CarModel } from '../data';

interface AIWidgetProps {
  scrollToSection: (section: 'hero' | 'models' | 'comparison' | 'booking' | 'pricing' | 'contact') => void;
  setFilteredModels: React.Dispatch<React.SetStateAction<CarModel[]>>;
  setComparisonModels: React.Dispatch<React.SetStateAction<CarModel[]>>;
  setCurrency: React.Dispatch<React.SetStateAction<'INR' | 'USD'>>;
  setHighlightedModelId: React.Dispatch<React.SetStateAction<string | null>>;
  setBookingData: React.Dispatch<React.SetStateAction<{ model: string; date: string; city: string }>>;
  setThemeMode: React.Dispatch<React.SetStateAction<'standard' | 'track'>>;
  allCars: CarModel[];
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isError?: boolean;
  toolsUsed?: string[];
}

type ModelProvider = 'groq' | 'gemini';
type ModelId = 'llama-3.3-70b-versatile' | 'llama-3.1-8b-instant' | 'gemini-2.5-flash' | 'gemini-2.5-flash-lite';

const MODEL_OPTIONS: { id: ModelId; label: string; provider: ModelProvider; badge?: string }[] = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', provider: 'groq', badge: 'Best' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', provider: 'groq', badge: 'Fast' },
  { id: 'gemini-2.5-flash', label: 'Gemini Flash', provider: 'gemini' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini Lite', provider: 'gemini' },
];

const TypewriterText = ({ text, speed = 10 }: { text: string; speed?: number }) => {
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

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  return lines.map((line, li) => (
    <React.Fragment key={li}>
      {li > 0 && <br />}
      {line.split(/(\*\*.*?\*\*)/g).map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </React.Fragment>
  ));
}

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
          animation: 'dotBounce 1.4s infinite ease-in-out both',
          animationDelay: `${i * 0.16}s`
        }} />
      ))}
    </div>
  </div>
);

const ToolPill = ({ tools }: { tools: string[] }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.5rem' }}>
    {tools.map((t, i) => (
      <span key={i} style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
        background: 'rgba(0,255,102,0.08)', border: '1px solid rgba(0,255,102,0.2)',
        borderRadius: '100px', padding: '0.2rem 0.6rem',
        fontSize: '0.7rem', color: 'var(--color-accent)', fontWeight: 600
      }}>
        <CheckCircle size={10} />
        {t}
      </span>
    ))}
  </div>
);

export default function AIWidget({
  scrollToSection, setFilteredModels, setComparisonModels,
  setCurrency, setHighlightedModelId, setBookingData, setThemeMode, allCars
}: AIWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelId>('llama-3.3-70b-versatile');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: 'Hi! I\'m **DriveAI** — your personal AeroMotors concierge.\n\nI can filter the fleet, compare specs, switch currencies, change the site theme, or pre-fill your test drive booking. Just ask!',
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [fabPulse, setFabPulse] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getSuggestions = useCallback(() => {
    const userCount = messages.filter(m => m.role === 'user').length;
    if (userCount === 0) return [
      { icon: '🚗', text: 'Show me all cars' },
      { icon: '💰', text: 'Cars under ₹25 lakhs' },
      { icon: '⚡', text: 'Compare top two models' },
      { icon: '🏆', text: 'Show the flagship' },
    ];
    const lastAI = messages.filter(m => m.role === 'model').pop()?.text.toLowerCase() || '';
    if (lastAI.includes('filter') || lastAI.includes('found') || lastAI.includes('showing'))
      return [
        { icon: '🔄', text: 'Show all cars' },
        { icon: '📊', text: 'Compare these models' },
        { icon: '🗓️', text: 'Book a test drive' },
      ];
    if (lastAI.includes('highlight') || lastAI.includes('apex') || lastAI.includes('recommend'))
      return [
        { icon: '🗓️', text: 'Book a test drive for it' },
        { icon: '📊', text: 'Compare with others' },
        { icon: '💵', text: 'Show price in USD' },
      ];
    if (lastAI.includes('compar') || lastAI.includes('versus'))
      return [
        { icon: '🗓️', text: 'Book the better one' },
        { icon: '💵', text: 'Switch to USD' },
        { icon: '🔄', text: 'Show all cars' },
      ];
    if (lastAI.includes('theme') || lastAI.includes('track') || lastAI.includes('mode'))
      return [
        { icon: '🏎️', text: 'Show the fastest car' },
        { icon: '🌿', text: 'Switch back to standard mode' },
        { icon: '📊', text: 'Compare all models' },
      ];
    return [
      { icon: '🔄', text: 'Show all cars' },
      { icon: '💵', text: 'Show prices in USD' },
      { icon: '🗓️', text: 'Book a test drive' },
      { icon: '⚡', text: 'Fastest car?' },
    ];
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setFabPulse(false);
    }
  }, [isOpen]);

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

  useEffect(() => {
    return () => { if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current); };
  }, []);

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showToast('Voice not supported in this browser', 'error');
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e: any) => { setInput(e.results[0][0].transcript); setIsListening(false); };
    recognition.onerror = () => { setIsListening(false); showToast('Voice recognition failed', 'error'); };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toolDefs = [
    {
      name: 'scrollToSection',
      description: 'Scrolls to a page section. Call alongside other tools.',
      parameters: {
        type: 'object',
        properties: { sectionId: { type: 'string', enum: ['hero', 'models', 'comparison', 'booking', 'pricing', 'contact'] } },
        required: ['sectionId']
      }
    },
    {
      name: 'filterModels',
      description: 'Filters car grid by price or type. Call with no args to show all cars.',
      parameters: {
        type: 'object',
        properties: {
          maxPriceLakhs: { type: 'number', description: 'Max price in lakhs' },
          carType: { type: 'string', enum: ['SUV', 'Sedan', 'Coupe', 'Hypercar'] }
        },
        required: []
      }
    },
    {
      name: 'compareModels',
      description: 'Loads cars into comparison table. Fuzzy name matching.',
      parameters: {
        type: 'object',
        properties: {
          modelNames: { type: 'array', items: { type: 'string' }, description: 'e.g. ["Apex", "Nova"]' }
        },
        required: ['modelNames']
      }
    },
    {
      name: 'highlightModel',
      description: 'Spotlights a car in the fleet. Clears filters first. Use when recommending.',
      parameters: {
        type: 'object',
        properties: { modelName: { type: 'string', description: 'Partial name OK, e.g. "Apex"' } },
        required: ['modelName']
      }
    },
    {
      name: 'prefillBooking',
      description: 'Pre-fills the test drive form. All fields optional.',
      parameters: {
        type: 'object',
        properties: {
          modelName: { type: 'string' },
          date: { type: 'string', description: 'YYYY-MM-DD' },
          city: { type: 'string' }
        },
        required: []
      }
    },
    {
      name: 'changeCurrency',
      description: 'Switches all pricing between INR and USD.',
      parameters: {
        type: 'object',
        properties: { currency: { type: 'string', enum: ['INR', 'USD'] } },
        required: ['currency']
      }
    },
    {
      name: 'setThemeMode',
      description: 'Changes site accent color. "track" = Racing Red (sporty), "standard" = Neon Green (default).',
      parameters: {
        type: 'object',
        properties: { mode: { type: 'string', enum: ['standard', 'track'] } },
        required: ['mode']
      }
    }
  ];

  const executeTool = (name: string, args: any): { result: string; label: string } => {
    try {
      switch (name) {
        case 'scrollToSection': {
          const sec = args.sectionId as 'hero' | 'models' | 'comparison' | 'booking' | 'pricing' | 'contact';
          scrollToSection(sec);
          return { result: `Scrolled to ${sec}.`, label: `→ ${sec}` };
        }
        case 'filterModels': {
          let filtered = [...allCars];
          const hasMax = typeof args.maxPriceLakhs === 'number';
          const hasType = typeof args.carType === 'string' && args.carType.trim().length > 0;
          if (hasMax) filtered = filtered.filter(c => c.price <= args.maxPriceLakhs);
          if (hasType) filtered = filtered.filter(c =>
            c.type.toLowerCase() === args.carType.toLowerCase() ||
            c.name.toLowerCase().includes(args.carType.toLowerCase())
          );
          const finalList = filtered.length > 0 ? filtered : [...allCars];
          flushSync(() => setFilteredModels(finalList));
          scrollToSection('models');
          if (!hasMax && !hasType) return { result: `Showing all ${allCars.length} cars.`, label: 'Show All' };
          const criteria: string[] = [];
          if (hasMax) criteria.push(`under ₹${args.maxPriceLakhs}L`);
          if (hasType) criteria.push(args.carType);
          return {
            result: `Filtered to ${finalList.length} car${finalList.length !== 1 ? 's' : ''}: ${finalList.map(c => c.name).join(', ')}.`,
            label: `Filter: ${criteria.join(' + ')}`
          };
        }
        case 'compareModels': {
          if (!Array.isArray(args.modelNames) || args.modelNames.length === 0) {
            const top2 = [...allCars].sort((a, b) => b.price - a.price).slice(0, 2);
            flushSync(() => setComparisonModels(top2));
            scrollToSection('comparison');
            return { result: `Showing top 2: ${top2.map(c => c.name).join(' vs ')}.`, label: 'Compare: Top 2' };
          }
          const found = args.modelNames
            .map((n: string) => allCars.find(c =>
              c.name.toLowerCase().includes(n.toLowerCase()) ||
              c.type.toLowerCase().includes(n.toLowerCase())
            ))
            .filter(Boolean) as CarModel[];
          const unique = found.filter((c, i, a) => a.findIndex(x => x.id === c.id) === i);
          if (unique.length === 0) {
            const top2 = [...allCars].sort((a, b) => b.price - a.price).slice(0, 2);
            flushSync(() => setComparisonModels(top2));
            scrollToSection('comparison');
            return { result: `Names not matched. Showing top 2: ${top2.map(c => c.name).join(' vs ')}.`, label: 'Compare: Top 2' };
          }
          flushSync(() => setComparisonModels(unique));
          scrollToSection('comparison');
          return {
            result: `Comparison: ${unique.map(c => c.name).join(' vs ')}.`,
            label: `Compare: ${unique.map(c => c.name.split(' ')[0]).join(' vs ')}`
          };
        }
        case 'highlightModel': {
          const q = (args.modelName || '').toLowerCase();
          const match = allCars.find(c =>
            c.name.toLowerCase().includes(q) ||
            c.type.toLowerCase().includes(q) ||
            (c.isFlagship && /flagship|apex|best|top|fastest/.test(q))
          );
          if (!match) return { result: `No car found matching "${args.modelName}".`, label: 'Highlight Failed' };
          flushSync(() => { setFilteredModels([...allCars]); setHighlightedModelId(match.id); });
          scrollToSection('models');
          if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
          highlightTimerRef.current = setTimeout(() => setHighlightedModelId(null), 5000);
          return { result: `${match.name} spotlighted. Filters cleared.`, label: `Spotlight: ${match.name.split(' ')[0]}` };
        }
        case 'prefillBooking': {
          let resolvedModel = args.modelName || '';
          if (resolvedModel) {
            const q = resolvedModel.toLowerCase();
            const match = allCars.find(c =>
              c.name.toLowerCase().includes(q) ||
              c.type.toLowerCase().includes(q) ||
              (c.isFlagship && /flagship|apex|best|top/.test(q))
            );
            if (match) resolvedModel = match.name;
          }
          let resolvedDate = args.date || '';
          if (!resolvedDate) {
            const hint = (args.modelName || '').toLowerCase();
            const today = new Date();
            if (hint.includes('tomorrow')) { today.setDate(today.getDate() + 1); resolvedDate = today.toISOString().split('T')[0]; }
            else if (hint.includes('saturday')) { const d = (6 - today.getDay() + 7) % 7 || 7; today.setDate(today.getDate() + d); resolvedDate = today.toISOString().split('T')[0]; }
            else if (hint.includes('sunday')) { const d = (7 - today.getDay()) % 7 || 7; today.setDate(today.getDate() + d); resolvedDate = today.toISOString().split('T')[0]; }
          }
          flushSync(() => setBookingData(prev => ({
            model: resolvedModel || prev.model,
            date: resolvedDate || prev.date,
            city: args.city || prev.city
          })));
          scrollToSection('booking');
          const filled = [resolvedModel, resolvedDate, args.city].filter(Boolean);
          return { result: `Booking form filled${filled.length ? `: ${filled.join(', ')}` : ''}.`, label: 'Booking Pre-filled' };
        }
        case 'changeCurrency': {
          const cur = args.currency as 'INR' | 'USD';
          if (cur !== 'INR' && cur !== 'USD') return { result: 'Invalid currency.', label: 'Failed' };
          flushSync(() => setCurrency(cur));
          scrollToSection('pricing');
          return { result: `Prices updated to ${cur}.`, label: `Currency: ${cur}` };
        }
        case 'setThemeMode': {
          const mode = args.mode as 'standard' | 'track';
          if (mode !== 'standard' && mode !== 'track') return { result: 'Invalid mode.', label: 'Failed' };
          flushSync(() => setThemeMode(mode));
          return {
            result: `Theme: ${mode === 'track' ? 'Track Mode (Racing Red)' : 'Standard Mode (Neon Green)'}.`,
            label: mode === 'track' ? '🔴 Track Mode' : '🟢 Standard Mode'
          };
        }
        default:
          return { result: `Unknown tool: ${name}`, label: 'Unknown' };
      }
    } catch (e: any) {
      console.error('Tool error:', name, e);
      return { result: `Tool failed: ${e?.message || 'unknown'}`, label: 'Error' };
    }
  };

  const buildSystemPrompt = () => `You are DriveAI, the AI concierge for AeroMotors electric vehicles. You control the website UI via tools.

## Fleet
| Car | Type | Price | Range | 0-100 | Seats |
|-----|------|-------|-------|-------|-------|
| Aether SUV | SUV | ₹18.5L | 450km | 7.2s | 5 — best for families |
| Zephyr Sedan | Sedan | ₹22L | 520km | 5.8s | 5 — longest range |
| Nova Coupe | Coupe | ₹35L | 480km | 4.1s | 2 — sporty |
| Apex Hypercar | Hypercar | ₹120L | 600km | 1.9s | 2 — flagship, fastest |

## Rules
1. ALWAYS call at least one tool. Never just describe — act.
2. "Show all" / "reset" → filterModels({}) with no arguments.
3. Family / 5-seater → highlightModel("Aether SUV").
4. Fastest / performance → highlightModel("Apex Hypercar").
5. "Compare top two" → compareModels(["Apex Hypercar","Nova Coupe"]).
6. Sporty/racing/aggressive theme → setThemeMode("track").
7. Eco/calm/default theme → setThemeMode("standard").
8. Multiple tools per response is fine.
9. Respond in max 2-3 sentences. Use **bold** for car names and specs.`;

  const callGroq = async (userMsg: string, model: string, history: ChatMessage[]): Promise<{ text: string; toolsUsed: string[] }> => {
    const key = import.meta.env.VITE_GROQ_API_KEY;
    if (!key) throw new Error('VITE_GROQ_API_KEY not set in .env.local');
    const msgs: any[] = [
      { role: 'system', content: buildSystemPrompt() },
      ...history.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text })),
      { role: 'user', content: userMsg }
    ];
    const tools = toolDefs.map(t => ({ type: 'function' as const, function: t }));
    const r1 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: msgs, tools, tool_choice: 'auto', temperature: 0.3, max_tokens: 1024 })
    });
    if (!r1.ok) { const e = await r1.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${r1.status}`); }
    const d1 = await r1.json();
    const assistantMsg = d1.choices?.[0]?.message;
    if (!assistantMsg) throw new Error('Empty Groq response');
    const toolsUsed: string[] = [];
    if (assistantMsg.tool_calls?.length > 0) {
      const toolResults: any[] = [];
      for (const tc of assistantMsg.tool_calls) {
        let args: any = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch { /* keep empty */ }
        const { result, label } = executeTool(tc.function.name, args);
        toolsUsed.push(label);
        toolResults.push({ role: 'tool', content: result, tool_call_id: tc.id });
      }
      const r2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [...msgs, assistantMsg, ...toolResults], temperature: 0.5, max_tokens: 512 })
      });
      if (r2.ok) {
        const d2 = await r2.json();
        const t = d2.choices?.[0]?.message?.content;
        if (t) return { text: t, toolsUsed };
      }
      return { text: toolResults.map(r => r.content).join(' '), toolsUsed };
    }
    return { text: assistantMsg.content || "I'm not sure how to help.", toolsUsed };
  };

  const callGemini = async (userMsg: string, model: string, history: ChatMessage[]): Promise<{ text: string; toolsUsed: string[] }> => {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key) throw new Error('VITE_GEMINI_API_KEY not set in .env.local');
    const contents = [
      ...history.map(m => ({ role: m.role === 'model' ? 'model' : 'user', parts: [{ text: m.text }] })),
      { role: 'user', parts: [{ text: userMsg }] }
    ];
    const geminiTools = [{
      functionDeclarations: toolDefs.map(t => ({
        name: t.name, description: t.description,
        parameters: { type: 'OBJECT', properties: t.parameters.properties, required: (t.parameters as any).required || [] }
      }))
    }];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const r1 = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: buildSystemPrompt() }] }, contents, tools: geminiTools, generationConfig: { temperature: 0.3, maxOutputTokens: 1024 } })
    });
    if (!r1.ok) { const e = await r1.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${r1.status}`); }
    const d1 = await r1.json();
    if (d1.error) throw new Error(d1.error.message);
    const parts = d1.candidates?.[0]?.content?.parts;
    if (!parts?.length) throw new Error('Empty Gemini response');
    const toolsUsed: string[] = [];
    const fnParts = parts.filter((p: any) => p.functionCall);
    if (fnParts.length > 0) {
      const resultParts: any[] = [];
      for (const p of fnParts) {
        const { result, label } = executeTool(p.functionCall.name, p.functionCall.args || {});
        toolsUsed.push(label);
        resultParts.push({ functionResponse: { name: p.functionCall.name, response: { result } } });
      }
      const r2 = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: 'Confirm what changed on the page in 1-2 sentences. Use **bold** for car names.' }] }, contents: [...contents, d1.candidates[0].content, { role: 'user', parts: resultParts }], generationConfig: { temperature: 0.5, maxOutputTokens: 256 } })
      });
      if (r2.ok) { const d2 = await r2.json(); const t = d2.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text; if (t) return { text: t, toolsUsed }; }
      return { text: resultParts.map(p => p.functionResponse.response.result).join(' '), toolsUsed };
    }
    const tp = parts.find((p: any) => p.text);
    return { text: tp?.text || "I'm not sure how to help.", toolsUsed };
  };

  const handleSend = async (forcedInput?: string) => {
    const text = (forcedInput !== undefined ? forcedInput : input).trim();
    if (!text || isLoading) return;
    setInput('');
    const historySnapshot = [...messages]; // snapshot BEFORE adding new user msg
    setMessages(prev => [...prev, { role: 'user', text, timestamp: Date.now() }]);
    setIsLoading(true);
    try {
      const provider = MODEL_OPTIONS.find(m => m.id === selectedModel)?.provider || 'groq';
      const { text: responseText, toolsUsed } = provider === 'gemini'
        ? await callGemini(text, selectedModel, historySnapshot)
        : await callGroq(text, selectedModel, historySnapshot);
      setMessages(prev => [...prev, { role: 'model', text: responseText, timestamp: Date.now(), toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined }]);
    } catch (err: any) {
      const isKeyErr = err.message?.includes('API key') || err.message?.includes('not set');
      setMessages(prev => [...prev, {
        role: 'model',
        text: isKeyErr ? `API key missing. Add **VITE_GROQ_API_KEY** or **VITE_GEMINI_API_KEY** to .env.local.` : `Request failed: ${err.message || 'Unknown error'}. Try switching the AI model.`,
        timestamp: Date.now(), isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'model', text: 'Chat cleared! ✨ How can I help you explore AeroMotors today?', timestamp: Date.now() }]);
    flushSync(() => { setFilteredModels([...allCars]); setHighlightedModelId(null); });
  };

  const currentModelLabel = MODEL_OPTIONS.find(m => m.id === selectedModel)?.label || selectedModel;
  const suggestions = getSuggestions();

  return (
    <div className="ai-widget-container">
      {toast && (
        <div className="ai-toast" style={{
          animation: 'slideInUp 0.4s var(--ease-out-expo) forwards',
          background: toast.type === 'error' ? 'rgba(255,50,50,0.95)' : 'var(--color-accent)',
          color: toast.type === 'error' ? '#fff' : '#000',
          boxShadow: toast.type === 'error' ? '0 10px 30px rgba(255,50,50,0.3)' : '0 10px 30px rgba(0,0,0,0.3)'
        }}>
          {toast.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
          {toast.text}
        </div>
      )}

      <div className={`ai-chat-window ${isOpen ? 'open' : 'closed'}`}>
        <div className="ai-gradient-border" />

        <div className="ai-chat-header">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-sm">
              <div className="ai-avatar"><Zap size={16} /></div>
              <div>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>DriveAI</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-accent)', display: 'block', lineHeight: 1 }}>
                  {isLoading ? 'Thinking...' : 'Online'}
                </span>
              </div>
            </div>
            <div className="flex gap-sm items-center">
              <button onClick={clearChat} title="Reset chat" className="ai-header-btn"><RotateCcw size={14} /></button>
              <button onClick={() => setIsOpen(false)} className="ai-header-btn" title="Close"><X size={16} /></button>
            </div>
          </div>

          <button className="ai-model-picker" onClick={() => setShowModelPicker(prev => !prev)}>
            <Zap size={12} color="var(--color-accent)" />
            <span>{currentModelLabel}</span>
            <ChevronDown size={12} style={{ transform: showModelPicker ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
          </button>

          {showModelPicker && (
            <div className="ai-model-dropdown">
              {MODEL_OPTIONS.map(m => (
                <button key={m.id} className={`ai-model-option ${selectedModel === m.id ? 'active' : ''}`}
                  onClick={() => { setSelectedModel(m.id); setShowModelPicker(false); }}>
                  <span>{m.label}</span>
                  {m.badge && <span className="ai-model-badge">{m.badge}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ai-chat-messages hide-scrollbar">
          {messages.map((msg, idx) => (
            <div key={`${idx}-${msg.timestamp}`}
              className={`message ${msg.role === 'user' ? 'message-user' : 'message-ai'} ${msg.isError ? 'message-error' : ''}`}>
              <div className="flex items-center gap-sm" style={{ marginBottom: '0.4rem', opacity: 0.6, fontSize: '0.7rem' }}>
                {msg.role === 'user' ? <User size={11} /> : <Zap size={11} color="var(--color-accent)" />}
                <span>{msg.role === 'user' ? 'You' : 'DriveAI'}</span>
                <span style={{ marginLeft: 'auto' }}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {msg.toolsUsed && msg.toolsUsed.length > 0 && <ToolPill tools={msg.toolsUsed} />}
              {msg.role === 'model' && idx === messages.length - 1 && !msg.isError
                ? <TypewriterText text={msg.text} />
                : <span>{renderMarkdown(msg.text)}</span>
              }
              {msg.isError && (
                <button onClick={() => { const last = messages.filter(m => m.role === 'user').pop()?.text; if (last) handleSend(last); }}
                  className="ai-retry-btn" style={{ marginTop: '0.75rem' }}>
                  <RotateCcw size={12} /> Try Again
                </button>
              )}
            </div>
          ))}
          {isLoading && <LoadingDots />}
          <div ref={messagesEndRef} />
        </div>

        {!isLoading && (
          <div className="ai-suggestions hide-scrollbar">
            {suggestions.map((s, i) => (
              <button key={i} className="ai-chip" onClick={() => handleSend(s.text)}>
                <span>{s.icon}</span>
                <span>{s.text}</span>
                <ArrowRight size={10} style={{ opacity: 0.4 }} />
              </button>
            ))}
          </div>
        )}

        <div className="ai-chat-input-area">
          <button className={`ai-mic-btn ${isListening ? 'listening' : ''}`} onClick={startListening} title="Voice" disabled={isLoading}>
            <Mic size={16} color={isListening ? '#000' : '#fff'} />
          </button>
          <input ref={inputRef} type="text" className="ai-chat-input" placeholder="Ask DriveAI anything..."
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(); }}
            disabled={isLoading} maxLength={500} />
          <button className="ai-chat-send" onClick={() => handleSend()}
            disabled={isLoading || !input.trim()} style={{ opacity: isLoading || !input.trim() ? 0.4 : 1 }}>
            <Send size={16} style={{ marginLeft: -1 }} />
          </button>
        </div>

        <div style={{ padding: '0 1rem 0.75rem', textAlign: 'center', fontSize: '0.65rem', color: '#444', letterSpacing: '0.05em' }}>
          <kbd style={{ background: '#1a1a1a', border: '1px solid #333', padding: '1px 5px', borderRadius: 3, fontSize: '0.6rem' }}>Ctrl+K</kbd>
          {' '}to toggle · {allCars.length} models available
        </div>
      </div>

      {!isOpen && (
        <button className={`ai-fab ${fabPulse ? 'ai-fab-pulse' : ''}`} onClick={() => setIsOpen(true)}
          aria-label="Open DriveAI Assistant" title="Open DriveAI (Ctrl+K)">
          <Sparkles size={24} />
        </button>
      )}
    </div>
  );
}