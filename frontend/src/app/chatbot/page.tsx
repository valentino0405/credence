'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
// Using simple HTML elements instead of custom UI components
import { sendMessageToGemini, saveChatToDatabase } from '@/lib/gemini';
import Aurora from '@/app/home/Aurora';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

const suggestedQuestions = [
  "What are the best stocks to invest in right now?",
  "How do I start trading as a beginner?",
  "What's the current market trend?",
  "Explain risk management in trading",
  "How to build a diversified portfolio?"
];

export default function ChatbotPage() {
  const { user, isSignedIn, isLoaded } = useUser();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save user profile automatically when they visit chatbot
  useEffect(() => {
    const saveUserProfile = async () => {
      if (!isSignedIn || !user) return;
      
      try {
        const userEmail = user.primaryEmailAddress?.emailAddress;
        const userName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
        
        if (userEmail) {
          console.log('ATTEMPTING TO SAVE USER PROFILE:', { userId: user.id, email: userEmail, name: userName });
          
          const response = await fetch('/api/user/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              email: userEmail,
              name: userName || 'Unknown User'
            })
          });
          
          const result = await response.json();
          console.log('USER PROFILE SAVE RESULT:', result);
        } else {
          console.error('NO USER EMAIL FOUND:', user);
        }
      } catch (error) {
        console.error('Failed to save user profile:', error);
      }
    };
    
    saveUserProfile();
  }, [isSignedIn, user]);

  // Load chat history first
  useEffect(() => {
    const loadHistory = async () => {
      if (!isSignedIn || !user) return;
      try {
        const res = await fetch(`/api/chat/history?userId=${user.id}&limit=30`);
        if (res.ok) {
          const data = await res.json();
          if (data.history && data.history.length > 0) {
            const histMessages: Message[] = [];
            data.history.forEach((entry: any) => {
              // Push user question then AI answer as separate messages for UI
              histMessages.push({
                id: entry.id + '-q',
                text: entry.userMessage,
                isUser: true,
                timestamp: entry.timestamp
              });
              histMessages.push({
                id: entry.id + '-a',
                text: entry.aiResponse,
                isUser: false,
                timestamp: entry.timestamp
              });
            });
            setMessages(histMessages);
            setShowSuggestions(false);
            return; // Don't add welcome if history exists
          }
        }
        // Add welcome if no history
        const welcomeMessage: Message = {
          id: 'welcome',
          text: `Welcome to Credence AI! I'm your financial trading assistant. Ask me anything about stocks, trading strategies, market analysis, or investment planning. How can I help you today?`,
          isUser: false,
          timestamp: new Date().toISOString()
        };
        setMessages([welcomeMessage]);
      } catch (err) {
        console.error('History load failed:', err);
      }
    };
    loadHistory();
  }, [isSignedIn, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage.trim();
    
    if (!textToSend || !user) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: textToSend,
      isUser: true,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      console.log('Sending message to Gemini:', textToSend);
      
      // Get AI response from Gemini
      const aiResponse = await sendMessageToGemini(textToSend);
      
      console.log('Received Gemini response:', aiResponse);

      // Add AI response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Persist combined QA in one document
      if (user?.id) {
        await saveChatToDatabase(
          user.id,
          textToSend,
          aiResponse,
          user.primaryEmailAddress?.emailAddress,
          user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim()
        );
      }

    } catch (error) {
      console.error('Chat error:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: "Sorry, I'm having trouble responding right now. Please try again in a moment.",
        isUser: false,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 text-center rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Sign In Required</h2>
          <p className="text-gray-600">Please sign in to access the AI chatbot.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      <Aurora />
      
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 flex flex-col h-[calc(100vh-8rem)]">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Credence AI Assistant</h1>
                <p className="text-blue-100">Your intelligent trading companion</p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.isUser
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                      : 'bg-gray-100 text-gray-800 border'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {!message.isUser && (
                      <Bot className="h-5 w-5 mt-0.5 flex-shrink-0 text-blue-600" />
                    )}
                    {message.isUser && (
                      <User className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.text}
                      </p>
                      <p className={`text-xs mt-2 ${
                        message.isUser ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-3 border">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-5 w-5 text-blue-600" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {showSuggestions && messages.length <= 1 && (
            <div className="px-6 pb-4">
              <div className="flex items-center space-x-2 mb-3">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-800">Suggested questions:</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="text-left p-3 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 rounded-xl border border-blue-200 transition-colors text-sm text-gray-800 font-medium"
                    disabled={isLoading}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-6 border-t bg-gray-50/50">
            <div className="flex space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Ask me about trading, stocks, or market analysis..."
                  value={inputMessage}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 outline-none text-gray-900 placeholder-gray-500"
                />
              </div>
              <button
                onClick={() => sendMessage()}
                disabled={isLoading || !inputMessage.trim()}
                className="cursor-target bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-3 rounded-xl transition-all transform hover:scale-105 disabled:hover:scale-100 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}