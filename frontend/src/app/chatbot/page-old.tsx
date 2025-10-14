"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Aurora from '@/app/home/Aurora';
import { useAuth } from '@clerk/nextjs';
import { API_BASE_URL } from '../../config/api';

interface ChatMessage {
  type: 'user' | 'assistant';
  message: string;
  timestamp: string;
  stocks_mentioned?: string[];
}

interface SuggestedQuestion {
  category: string;
  questions: string[];
}

export default function ChatbotPage(): React.ReactElement {
  const { user, isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      type: 'assistant',
      message: '👋 Hello! I\'m **CREDENCE AI**, your personal stock market analyst and trading assistant. \n\n🎯 I can help you with:\n- **Stock Analysis** & Real-time insights\n- **Portfolio Management** & Risk assessment\n- **Market Trends** & Trading strategies\n- **Technical Analysis** & Predictions\n\nWhat would you like to know about the markets today?',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(true);
  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>([]);

  // Handle redirect if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  // Load chat history and suggestions on mount
  useEffect(() => {
    if (isSignedIn && user) {
      loadChatHistory();
      loadSuggestedQuestions();
    }
  }, [isSignedIn, user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadChatHistory = async () => {
    // Temporarily disabled - let's focus on basic chat first
    console.log('Chat history loading disabled for now');
  };

  const loadSuggestedQuestions = async () => {
    // Set some default suggestions for now
    setSuggestedQuestions([
      {
        category: 'Portfolio Analysis',
        questions: ['Analyze my portfolio', 'What are good investment strategies?']
      },
      {
        category: 'Market Sentiment', 
        questions: ['What are the latest market trends?', 'Should I buy or sell now?']
      },
      {
        category: 'Stock Suggestions',
        questions: ['Recommend some growth stocks', 'What about dividend stocks?']
      },
      {
        category: 'Learn Trading',
        questions: ['How do I start trading?', 'Explain technical analysis']
      }
    ]);
  };

  const sendMessage = async (messageText: string = inputMessage) => {
    if (!messageText.trim() || !user) return;

    const userMessage: ChatMessage = {
      type: 'user',
      message: messageText.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      const apiUrl = `${API_BASE_URL}/send`;
      console.log('🚀 Calling API:', apiUrl);
      console.log('📦 Sending data:', { user_id: user.id, message: messageText.trim() });
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          message: messageText.trim()
        })
      });
      
      console.log('📬 Response status:', response.status);
      console.log('📬 Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      const data = await response.json();
      console.log('✅ Received response data:', data);
      
      if (data.success) {
        const assistantMessage: ChatMessage = {
          type: 'assistant',
          message: data.response,
          timestamp: data.timestamp
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('AI response failed');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        type: 'assistant',
        message: '🔧 I\'m experiencing some technical difficulties right now. Please try again in a moment, or refresh the page if the issue persists.',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessage = (text: string) => {
    // Simple markdown-like formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/\n/g, '<br>'); // Line breaks
  };

  // Show loading while auth is loading
  if (!isLoaded) {
    return (
      <div className='w-full h-screen relative bg-black flex justify-center items-center'>
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show loading while redirecting if not authenticated
  if (!isSignedIn) {
    return (
      <div className='w-full h-screen relative bg-black flex justify-center items-center'>
        <div className="text-white text-xl">Redirecting to sign in...</div>
      </div>
    );
  }

  return (
    <div className='w-full h-screen relative bg-black'>
      {/* Aurora Background */}
      <div style={{ width: "100%", height: "100%", position: "fixed", top: 0, left: 0, zIndex: 0 }}>
        <Aurora
          colorStops={["#7CFF67", "#B19EEF", "#5227FF"]}
          blend={0.3}
          amplitude={0.8}
          speed={0.3}
        />
      </div>

      {/* Chat Interface */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <div className="backdrop-blur-md bg-white/10 border-b border-white/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                🤖 CREDENCE AI
                <span className="text-sm font-normal text-green-400 bg-green-400/20 px-2 py-1 rounded-full">
                  ● Online
                </span>
              </h1>
              <p className="text-white/70 text-sm">Your AI Stock Market Assistant</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-all duration-200"
              >
                🔄 New Chat
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-purple-600/80 hover:bg-purple-600 text-white rounded-lg transition-all duration-200"
              >
                📊 Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-4xl rounded-2xl px-6 py-4 ${
                  message.type === 'user'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                    : 'backdrop-blur-md bg-white/10 border border-white/20 text-white'
                }`}
              >
                <div
                  className="prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: formatMessage(message.message) }}
                />
                {message.stocks_mentioned && message.stocks_mentioned.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/20">
                    <div className="text-xs text-white/60 mb-1">Stocks analyzed:</div>
                    <div className="flex flex-wrap gap-1">
                      {message.stocks_mentioned.map((stock, i) => (
                        <span key={i} className="px-2 py-1 bg-white/20 rounded text-xs">
                          {stock}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-xs text-white/50 mt-2">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="backdrop-blur-md bg-white/10 border border-white/20 text-white rounded-2xl px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-sm">CREDENCE AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          {/* Suggested Questions */}
          {showSuggestions && suggestedQuestions.length > 0 && (
            <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                💡 Try asking me about:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestedQuestions.slice(0, 4).map((category, categoryIndex) => (
                  <div key={categoryIndex}>
                    <h4 className="text-white/80 font-medium mb-2 text-sm">{category.category}</h4>
                    <div className="space-y-1">
                      {category.questions.slice(0, 2).map((question, questionIndex) => (
                        <button
                          key={questionIndex}
                          onClick={() => sendMessage(question)}
                          className="block w-full text-left text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2 text-sm transition-all duration-200 border border-white/10 hover:border-white/20"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="backdrop-blur-md bg-white/10 border-t border-white/20 px-6 py-4">
          <div className="flex gap-4 items-end max-w-6xl mx-auto">
            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about stocks, market trends, portfolio analysis, or trading strategies..."
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 resize-none"
                rows={3}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                inputMessage.trim() && !isLoading
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg'
                  : 'bg-white/20 text-white/50 cursor-not-allowed'
              }`}
            >
              {isLoading ? '⏳' : '🚀 Send'}
            </button>
          </div>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mt-3 max-w-6xl mx-auto">
            <button
              onClick={() => sendMessage("Analyze my portfolio performance")}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-full text-xs border border-white/20 transition-all duration-200"
            >
              📊 Portfolio Analysis
            </button>
            <button
              onClick={() => sendMessage("What's the current market sentiment?")}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-full text-xs border border-white/20 transition-all duration-200"
            >
              📈 Market Sentiment
            </button>
            <button
              onClick={() => sendMessage("Suggest some good stocks to buy today")}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-full text-xs border border-white/20 transition-all duration-200"
            >
              💡 Stock Suggestions
            </button>
            <button
              onClick={() => sendMessage("Explain technical analysis basics")}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-full text-xs border border-white/20 transition-all duration-200"
            >
              📚 Learn Trading
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}