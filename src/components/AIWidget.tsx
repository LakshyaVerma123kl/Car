/* eslint-disable @typescript-eslint/no-explicit-any, no-case-declarations, @typescript-eslint/no-unused-vars */
import React, { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { X, Send, Bot, User, Settings2, Mic, RotateCcw, Sparkles } from 'lucide-react';
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
}

type ModelType = 'gemini-2.5-flash' | 'gemini-2.5-flash-lite' | 'gemini-pro' | 'llama-3.3-70b-versatile' | 'llama-3.1-8b-instant';

// Typewriter component for AI responses
const TypewriterText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    setDisplayedText('');
    let i = 0;
    const intervalId = setInterval(() => {
      setDisplayedText(text.slice(0, i));
      i++;
      if (i > text.length) clearInterval(intervalId);
    }, 15); // Adjust typing speed here
    return () => clearInterval(intervalId);
  }, [text]);

  // Very basic markdown parser for bolding
  const renderText = () => {
    const parts = displayedText.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} style={{ color: 'var(--color-accent)' }}>{part.slice(2, -2)}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return <div>{renderText()}</div>;
};

export default function AIWidget({
  scrollToSection,
  setFilteredModels,
  setComparisonModels,
  setCurrency,
  setHighlightedModelId,
  setBookingData,
  allCars
}: AIWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelType>('llama-3.3-70b-versatile');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hi! I am DriveAI. I can help you find the perfect car, compare models, or book a test drive. What are you looking for today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestionChips = [
    "Show cars under 25 lakhs",
    "Compare the top models",
    "Which is best for family?",
    "Book test drive for Apex"
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, isLoading]);

  // Voice Input via Web Speech API
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  // Shared Tool Parameters Definition
  const toolDefinitions = [
    {
      name: "scrollToSection",
      description: "Scrolls the page to a specific section when the user asks to see something.",
      parameters: {
        type: "object",
        properties: { sectionId: { type: "string", enum: ["hero", "models", "comparison", "booking", "pricing", "contact"] } },
        required: ["sectionId"]
      }
    },
    {
      name: "filterModels",
      description: "Filters the car grid based on user preferences like budget or car type (e.g. 'SUVs under 20 lakhs').",
      parameters: {
        type: "object",
        properties: {
          maxPriceLakhs: { type: "number", description: "Maximum price in Lakhs (INR)" },
          type: { type: "string", description: "Car type: SUV, Sedan, Coupe, or Hypercar" }
        },
        required: []
      }
    },
    {
      name: "resetFilters",
      description: "Resets all filters to show all cars in the catalog again. Use this when the user wants to see all cars, or before highlighting a specific model after filters were applied.",
      parameters: {
        type: "object",
        properties: {
          confirm: { type: "boolean", description: "Always set to true when calling this function." }
        },
        required: []
      }
    },
    {
      name: "compareModels",
      description: "Updates the comparison table with specific models (e.g. 'Compare your top two models' or 'Compare Aether and Nova').",
      parameters: {
        type: "object",
        properties: {
          modelNames: { type: "array", items: { type: "string" }, description: "Exact names of the models to compare, like 'Aether SUV' or 'Nova Coupe'." }
        },
        required: ["modelNames"]
      }
    },
    {
      name: "prefillBooking",
      description: "Pre-fills the test drive booking form with details provided by the user (model, date, city).",
      parameters: {
        type: "object",
        properties: {
          modelName: { type: "string" },
          date: { type: "string", description: "Date in YYYY-MM-DD format if possible, or just the word." },
          city: { type: "string" }
        },
        required: []
      }
    },
    {
      name: "changeCurrency",
      description: "Changes the pricing currency between INR and USD.",
      parameters: {
        type: "object",
        properties: { currency: { type: "string", enum: ["INR", "USD"] } },
        required: ["currency"]
      }
    },
    {
      name: "highlightModel",
      description: "Highlights a specific model in the grid when recommending it (e.g. 'Which car is best for a family?'). NOTE: Automatically resets filters first so the highlighted car is visible.",
      parameters: {
        type: "object",
        properties: { modelName: { type: "string", description: "Name of the car model to highlight" } },
        required: ["modelName"]
      }
    }
  ];

  // Handle Tool Executions
  const executeTool = (name: string, args: any) => {
    let resultMessage = "Action completed.";
    try {
      switch (name) {
        case 'scrollToSection':
          scrollToSection(args.sectionId);
          resultMessage = `Navigated to ${args.sectionId} section.`;
          showFeedback(`Scrolled to ${args.sectionId}`);
          break;
        case 'filterModels':
          let filtered = [...allCars];
          if (args.maxPriceLakhs) {
            filtered = filtered.filter(c => c.price <= args.maxPriceLakhs);
          }
          if (args.type) {
            filtered = filtered.filter(c => c.type.toLowerCase() === args.type.toLowerCase());
          }
          setFilteredModels(filtered);
          scrollToSection('models');
          resultMessage = `Filtered models based on criteria. Found ${filtered.length} cars.`;
          showFeedback(`Applied Filters`);
          break;
        case 'resetFilters':
          flushSync(() => setFilteredModels([...allCars]));
          scrollToSection('models');
          resultMessage = `Reset all filters. Showing all ${allCars.length} cars.`;
          showFeedback('Reset Filters');
          break;
        case 'compareModels':
          const carsToCompare = allCars.filter(c => args.modelNames.some((n: string) => c.name.toLowerCase().includes(n.toLowerCase())));
          if (carsToCompare.length > 0) {
            setComparisonModels(carsToCompare);
            scrollToSection('comparison');
            resultMessage = `Comparing models: ${carsToCompare.map(c => c.name).join(', ')}.`;
            showFeedback('Updated Comparison Table');
          } else {
            resultMessage = `Could not find those exact models to compare.`;
          }
          break;
        case 'prefillBooking':
          setBookingData(prev => ({
            model: args.modelName || prev.model,
            date: args.date || prev.date,
            city: args.city || prev.city
          }));
          scrollToSection('booking');
          resultMessage = `Pre-filled booking form for ${args.modelName || 'a car'} in ${args.city || 'a city'}.`;
          showFeedback('Pre-filled Form');
          break;
        case 'changeCurrency':
          if (args.currency === 'INR' || args.currency === 'USD') {
            setCurrency(args.currency);
            scrollToSection('pricing');
            resultMessage = `Changed pricing currency to ${args.currency}.`;
            showFeedback(`Currency changed to ${args.currency}`);
          }
          break;
        case 'highlightModel':
          // FIX: Use flushSync to force React to render the reset filter immediately
          flushSync(() => {
            setFilteredModels([...allCars]);
          });
          const model = allCars.find(c => c.name.toLowerCase().includes(args.modelName.toLowerCase()));
          if (model) {
            flushSync(() => {
              setHighlightedModelId(model.id);
            });
            scrollToSection('models');
            setTimeout(() => setHighlightedModelId(null), 5000);
            resultMessage = `Highlighted the ${model.name}. Filters have been reset to show all cars.`;
            showFeedback(`Highlighted ${model.name}`);
          } else {
            resultMessage = `Could not find a model matching "${args.modelName}".`;
          }
          break;
      }
    } catch(e) {
      resultMessage = "Failed to execute action.";
    }
    return resultMessage;
  };

  const handleGemini = async (userMessage: string, modelStr: string) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error("VITE_GEMINI_API_KEY not set");

    const contents = messages.map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));
    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    const geminiTools = [{
      functionDeclarations: toolDefinitions.map(t => ({
        ...t,
        parameters: { ...t.parameters, type: "OBJECT" }
      }))
    }];

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelStr}:generateContent?key=${apiKey}`;
    const sysInstruction = "You are DriveAI, the AI assistant for AeroMotors. You control the website UI using tools. ALWAYS use the appropriate tool, THEN provide a short response. Use **markdown bolding** for emphasis. Cars: Aether SUV (family, 18.5L, 5-seater), Zephyr Sedan (executive, 22L, 5-seater), Nova Coupe (sporty, 35L, 2-seater), Apex Hypercar (flagship, 120L, 2-seater). IMPORTANT: When showing a specific car after filters were applied, call resetFilters first, then highlightModel. When comparing, use exact names like 'Aether SUV'. For currency, use changeCurrency.";

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sysInstruction }] },
        contents,
        tools: geminiTools
      })
    });
    
    const data = await res.json();
    if(data.error) throw new Error(data.error.message);

    if (data.candidates?.[0]?.content?.parts) {
      const parts = data.candidates[0].content.parts;
      const toolCalls = parts.filter((p: any) => p.functionCall);
      
      if (toolCalls.length > 0) {
        const toolCall = toolCalls[0].functionCall;
        const resultStr = executeTool(toolCall.name, toolCall.args);
        
        const toolResponseContents = [...contents, data.candidates[0].content, {
          role: "user",
          parts: [{
            functionResponse: { name: toolCall.name, response: { result: resultStr } }
          }]
        }];

        const secondRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
             systemInstruction: { parts: [{ text: "You are DriveAI. Provide a concise natural language response explaining the action you just took. Use **markdown bolding**." }]},
             contents: toolResponseContents 
          })
        });
        const secondData = await secondRes.json();
        return secondData.candidates?.[0]?.content?.parts?.[0]?.text || "I've updated the page for you.";
      }
      return parts.find((p: any) => p.text)?.text || "I'm not sure how to help with that.";
    }
    return "No response from Gemini.";
  };

  const handleGroq = async (userMessage: string, modelStr: string) => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) throw new Error("VITE_GROQ_API_KEY not set");

    const sysPrompt = `You are DriveAI, the AI assistant for AeroMotors. You control the website UI using tools. ALWAYS use the appropriate tool to update the UI, THEN provide a short response explaining what you did. Use **markdown bolding** for emphasis.

Available cars: Aether SUV (family, ₹18.5L, 5-seater), Zephyr Sedan (executive, ₹22L, 5-seater), Nova Coupe (sporty, ₹35L, 2-seater), Apex Hypercar (flagship, ₹120L, 2-seater).

IMPORTANT RULES:
- When the user asks about a specific car after a filter was applied, FIRST call resetFilters, THEN call highlightModel.
- When showing a specific car, always use highlightModel with the exact car name (e.g. "Apex Hypercar").
- When comparing, use exact names like "Aether SUV" and "Apex Hypercar".
- For currency changes, use changeCurrency with "INR" or "USD".`;

    // Build clean message history - only plain user/assistant text
    const groqMessages: any[] = [
      { role: "system", content: sysPrompt },
      ...messages.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text })),
      { role: "user", content: userMessage }
    ];

    const groqTools = toolDefinitions.map(t => ({
      type: "function" as const,
      function: t
    }));

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          model: modelStr,
          messages: groqMessages,
          tools: groqTools,
          tool_choice: "auto"
        })
      });
      
      const data = await res.json();
      
      // If Groq returns an error, retry WITHOUT tools (plain chat mode)
      if (data.error) {
        console.warn("Groq tool call failed, retrying without tools:", data.error.message);
        const fallbackRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({
            model: modelStr,
            messages: groqMessages
          })
        });
        const fallbackData = await fallbackRes.json();
        if (fallbackData.error) throw new Error(fallbackData.error.message);
        return fallbackData.choices?.[0]?.message?.content || "I'm not sure how to help with that.";
      }

      const msg = data.choices[0].message;
      
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        // Execute ALL tool calls (some queries need multiple tools)
        const toolResults: any[] = [];
        for (const tc of msg.tool_calls) {
          const args = JSON.parse(tc.function.arguments);
          const resultStr = executeTool(tc.function.name, args);
          toolResults.push({ role: "tool", content: resultStr, tool_call_id: tc.id });
        }

        // Build the follow-up messages with tool results
        const secondMessages = [
          ...groqMessages,
          msg,
          ...toolResults
        ];

        try {
          const secondRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
              model: modelStr,
              messages: secondMessages
            })
          });
          const secondData = await secondRes.json();
          if (secondData.error) {
            // If second call fails, just return a generic success message
            return `I've updated the page for you. ${toolResults.map(r => r.content).join(' ')}`;
          }
          return secondData.choices?.[0]?.message?.content || "I've updated the page for you.";
        } catch {
          return `I've updated the page for you. ${toolResults.map(r => r.content).join(' ')}`;
        }
      }

      return msg.content || "I'm not sure how to help with that.";
    } catch (error: any) {
      throw error;
    }
  };

  const handleSend = async (forcedInput?: string) => {
    const textToSend = forcedInput || input;
    if (!textToSend.trim() || isLoading) return;
    
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setIsLoading(true);

    try {
      let responseMessage = "";
      if (selectedModel.startsWith('gemini')) {
        responseMessage = await handleGemini(textToSend, selectedModel);
      } else {
        responseMessage = await handleGroq(textToSend, selectedModel);
      }
      setMessages(prev => [...prev, { role: 'model', text: responseMessage }]);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: `Error: ${error.message || 'Failed to connect'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'model', text: 'Chat cleared. How can I help you navigate the site today?' }]);
    executeTool('resetFilters', {});
  };

  return (
    <div className="ai-widget-container">
      {/* Toast Notification for AI Action */}
      {actionFeedback && (
        <div className="ai-toast fade-in-up">
          <Sparkles size={16} />
          {actionFeedback}
        </div>
      )}

      <div className={`ai-chat-window ${isOpen ? 'open' : 'closed'}`}>
        <div className="ai-chat-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-sm">
              <Bot className="text-gradient" size={24} color="var(--color-accent)" />
              <span style={{ fontWeight: 600 }}>DriveAI Assistant</span>
            </div>
            <div className="flex gap-sm">
              <button onClick={clearChat} title="Reset Chat" style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                <RotateCcw size={16} />
              </button>
              <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-sm" style={{ padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
            <Settings2 size={14} className="text-muted" />
            <select 
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value as ModelType)}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', fontSize: '0.85rem', width: '100%', outline: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              <option value="llama-3.3-70b-versatile" style={{ color: 'black' }}>Llama 3.3 70B Versatile</option>
              <option value="llama-3.1-8b-instant" style={{ color: 'black' }}>Llama 3.1 8B Instant</option>
              <option value="gemini-2.5-flash" style={{ color: 'black' }}>Gemini Flash</option>
              <option value="gemini-2.5-flash-lite" style={{ color: 'black' }}>Gemini Lite</option>
            </select>
          </div>
        </div>
        
        <div className="ai-chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role === 'user' ? 'message-user' : 'message-ai'}`}>
              <div className="flex items-center gap-sm" style={{ marginBottom: '0.5rem', opacity: 0.7, fontSize: '0.8rem' }}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                <span>{msg.role === 'user' ? 'You' : 'DriveAI'}</span>
              </div>
              {/* If it's the last AI message, type it out */}
              {msg.role === 'model' && idx === messages.length - 1 ? (
                <TypewriterText text={msg.text} />
              ) : (
                <div>
                   {msg.text.split(/(\*\*.*?\*\*)/g).map((part, i) => 
                     part.startsWith('**') && part.endsWith('**') ? 
                     <strong key={i} style={{ color: 'var(--color-accent)' }}>{part.slice(2, -2)}</strong> : 
                     <span key={i}>{part}</span>
                   )}
                </div>
              )}
            </div>
          ))}
          {isLoading && (
             <div className="message message-ai">
               <div className="flex gap-sm">
                 <div className="typing-dot" style={{ animationDelay: '0s' }}>.</div>
                 <div className="typing-dot" style={{ animationDelay: '0.2s' }}>.</div>
                 <div className="typing-dot" style={{ animationDelay: '0.4s' }}>.</div>
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        {messages.length < 3 && !isLoading && (
          <div className="ai-suggestions hide-scrollbar" style={{ display: 'flex', overflowX: 'auto', padding: '0 1.5rem 1rem', gap: '0.5rem' }}>
            {suggestionChips.map((chip, idx) => (
              <button 
                key={idx} 
                className="ai-suggestion-chip" 
                onClick={() => handleSend(chip)}
                style={{
                  whiteSpace: 'nowrap',
                  padding: '0.5rem 1rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '100px',
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <div className="ai-chat-input-area">
          <button 
            className={`ai-mic-btn ${isListening ? 'listening' : ''}`} 
            onClick={startListening}
            title="Voice Input"
          >
            <Mic size={18} color={isListening ? 'var(--color-bg-primary)' : 'var(--color-text-primary)'} />
          </button>
          <input 
            type="text" 
            className="ai-chat-input"
            placeholder="Ask me anything..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button className="ai-chat-send" onClick={() => handleSend()} disabled={isLoading || !input.trim()}>
            <Send size={18} style={{ marginLeft: '-2px' }} />
          </button>
        </div>
      </div>

      {!isOpen && (
        <button className="ai-fab fade-in-up" onClick={() => setIsOpen(true)}>
          <Sparkles size={24} />
        </button>
      )}
    </div>
  );
}
