"use client";
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Bot, User, Sparkles, X, Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Interface for speech recognition result
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

// Type for speech recognition instance
type SpeechRecognitionType = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: any) => void;
  onend: () => void;
  onerror: (event: any) => void;
};

type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  isLoading?: boolean;
};

type Suggestion = {
  id: string;
  text: string;
  icon: React.ReactNode;
};

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

  const suggestions: Suggestion[] = [
    {
      id: 'portfolio-performance',
      text: 'How is my portfolio performing?',
      icon: <Sparkles className="w-4 h-4 mr-2" />,
    },
    {
      id: 'tax-optimization',
      text: 'Show tax optimization opportunities',
      icon: <Sparkles className="w-4 h-4 mr-2" />,
    },
    {
      id: 'market-insights',
      text: 'What are today\'s market insights?',
      icon: <Sparkles className="w-4 h-4 mr-2" />,
    },
  ];

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      // Get the appropriate SpeechRecognition constructor
      const SpeechRecognitionConstructor = (
        window.SpeechRecognition || 
        window.webkitSpeechRecognition || 
        null
      ) as any;

      if (!SpeechRecognitionConstructor) {
        console.warn('Speech recognition not supported in this browser');
        return;
      }

      // Create new recognition instance
      const recognition = new SpeechRecognitionConstructor() as SpeechRecognitionType;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      // Handle speech recognition results
      recognition.onresult = (event: any) => {
        try {
          const results = event.results;
          if (!results || !results.length) return;
          
          const transcript = Array.from(results)
            .map((result: any) => (result[0]?.transcript || '').trim())
            .filter(Boolean)
            .join(' ');
          
          if (transcript) {
            setInput(prev => prev ? `${prev} ${transcript}` : transcript);
          }
        } catch (err) {
          console.error('Error processing speech recognition result:', err);
        }
      };

      // Handle recognition end
      recognition.onend = () => {
        if (isListening && recognitionRef.current === recognition) {
          try {
            recognition.start();
          } catch (err) {
            console.error('Error restarting speech recognition:', err);
            setIsListening(false);
          }
        }
      };

      // Handle errors
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      // Store reference
      recognitionRef.current = recognition;

      // Start listening if needed
      if (isListening) {
        try {
          recognition.start();
        } catch (err) {
          console.error('Error starting speech recognition:', err);
          setIsListening(false);
        }
      }

      // Cleanup
      return () => {
        try {
          if (recognitionRef.current === recognition) {
            recognition.stop();
            recognitionRef.current = null;
          }
        } catch (err) {
          console.error('Error stopping speech recognition:', err);
        }
      };
    } catch (err) {
      console.error('Error initializing speech recognition:', err);
      setIsListening(false);
    }
  }, [isListening]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
    setIsListening(!isListening);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: getAIResponse(input),
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const getAIResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase();
    
    if (lowerInput.includes('portfolio') && lowerInput.includes('perform')) {
      return 'Your portfolio has gained 3.2% this month, outperforming the S&P 500 by 1.5%. Your top performers are NVDA (+8.2%) and AAPL (+5.7%).';
    } else if (lowerInput.includes('tax') || lowerInput.includes('optimiz')) {
      return 'I found $1,250 in potential tax savings through tax-loss harvesting. Would you like me to implement these changes?';
    } else if (lowerInput.includes('market') || lowerInput.includes('insight')) {
      return 'Markets are up today with tech leading gains. The Fed is expected to hold rates steady. Consider rebalancing your tech holdings which now make up 45% of your portfolio.';
    } else if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
      return 'Hello! I\'m your AI investment assistant. How can I help you today?';
    } else {
      return 'I understand you want to know about: ' + userInput + '. I can help with portfolio analysis, market insights, and investment recommendations. Could you be more specific?';
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full h-14 w-14 p-0 bg-primary hover:bg-primary/90 shadow-lg"
        >
          <Bot className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col h-[600px] border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-primary/5">
        <div className="flex items-center space-x-2">
          <Bot className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Investment Assistant</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-medium mb-2">How can I help you today?</h4>
              <p className="text-sm text-muted-foreground mb-6">
                Ask me about your portfolio, market insights, or investment strategies.
              </p>
              <div className="space-y-2">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion.id}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-2"
                    onClick={() => handleSuggestionClick(suggestion.text)}
                  >
                    {suggestion.icon}
                    {suggestion.text}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex items-start gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <Avatar className="h-8 w-8 bg-primary/10">
                    <AvatarFallback className="bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    'rounded-lg px-4 py-2 max-w-[80%]',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {message.content}
                </div>
                {message.role === 'user' && (
                  <Avatar className="h-8 w-8 bg-primary/10">
                    <AvatarFallback className="bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted w-fit">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Input
            placeholder="Ask me anything about your investments..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="pr-20"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleListening}
              className={cn(
                'h-8 w-8',
                isListening ? 'text-red-500' : 'text-muted-foreground'
              )}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="h-8 w-8"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Powered by AI - May produce inaccurate information
        </p>
      </div>
    </div>
  );
}
