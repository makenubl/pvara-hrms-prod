import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import chatService from '../services/chatService';
import { format } from 'date-fns';
import {
  MessageCircle,
  X,
  Minimize2,
  Send,
  Users,
  Crown,
  ChevronDown,
} from 'lucide-react';

// Executive/chairman roles for special styling
const EXECUTIVE_ROLES = ['chairman', 'executive', 'director', 'admin'];

// Create notification sound using Web Audio API
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create a pleasant notification tone
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Pleasant notification frequency
    oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5
    oscillator.type = 'sine';
    
    // Gentle volume envelope
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
    
    // Second tone for a pleasant chime
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      
      osc2.frequency.setValueAtTime(880, audioContext.currentTime); // A5
      osc2.type = 'sine';
      
      gain2.gain.setValueAtTime(0, audioContext.currentTime);
      gain2.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
      gain2.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.25);
      
      osc2.start(audioContext.currentTime);
      osc2.stop(audioContext.currentTime + 0.25);
    }, 150);
  } catch (error) {
    console.log('Audio not supported');
  }
};

const ChatBox = () => {
  const { user, token } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const pollInterval = useRef(null);
  const lastMessageCount = useRef(0);

  const isAuthenticated = !!token && !!user;

  // Load messages and unread count on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadUnreadCount();
      loadUsers();
      
      // Poll for new messages every 10 seconds
      pollInterval.current = setInterval(() => {
        if (isOpen && !isMinimized) {
          loadMessages(true);
        } else {
          checkForNewMessages();
        }
      }, 10000);

      return () => {
        if (pollInterval.current) clearInterval(pollInterval.current);
      };
    }
  }, [isAuthenticated, user, isOpen, isMinimized]);

  // Load messages when chat is opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      loadMessages();
      markAsRead();
    }
  }, [isOpen, isMinimized]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkForNewMessages = async () => {
    try {
      const data = await chatService.getUnreadCount();
      const newCount = data.count || 0;
      
      // Play sound if there are new unread messages
      if (newCount > unreadCount && unreadCount >= 0) {
        playNotificationSound();
      }
      
      setUnreadCount(newCount);
    } catch (error) {
      console.error('Failed to check messages:', error);
    }
  };

  const loadMessages = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await chatService.getMessages({ limit: 100 });
      const newMessages = data.messages || [];
      
      // Play sound if new messages arrived while chat is open
      if (silent && newMessages.length > lastMessageCount.current && lastMessageCount.current > 0) {
        const latestMessage = newMessages[newMessages.length - 1];
        // Don't play sound for own messages
        if (latestMessage?.sender?._id !== user?._id) {
          playNotificationSound();
        }
      }
      
      lastMessageCount.current = newMessages.length;
      setMessages(newMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const data = await chatService.getUnreadCount();
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await chatService.getUsers();
      setUsers(data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const markAsRead = async () => {
    try {
      await chatService.markAsRead();
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const message = await chatService.sendMessage(newMessage);
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      setShowMentions(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    // Check for @ mentions
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex === value.length - 1) {
      setShowMentions(true);
      setMentionFilter('');
    } else if (lastAtIndex !== -1) {
      const textAfterAt = value.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(' ')) {
        setShowMentions(true);
        setMentionFilter(textAfterAt.toLowerCase());
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (mention) => {
    const lastAtIndex = newMessage.lastIndexOf('@');
    const beforeAt = newMessage.substring(0, lastAtIndex);
    setNewMessage(`${beforeAt}${mention} `);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const filteredUsers = users.filter(u => {
    const name = `${u.firstName} ${u.lastName}`.toLowerCase();
    const email = u.email.toLowerCase();
    return name.includes(mentionFilter) || email.includes(mentionFilter);
  });

  const isExecutive = (role) => EXECUTIVE_ROLES.includes(role);

  const formatMessageContent = (content) => {
    // Highlight @mentions
    return content.replace(/@(\S+)/g, '<span class="text-blue-400 font-semibold">@$1</span>');
  };

  const toggleChat = () => {
    if (isMinimized) {
      setIsMinimized(false);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const minimizeChat = () => {
    setIsMinimized(true);
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Button */}
      {(!isOpen || isMinimized) && (
        <button
          onClick={toggleChat}
          className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all duration-300 hover:scale-105 ${
            unreadCount > 0
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 animate-pulse'
              : 'bg-gradient-to-r from-gray-700 to-gray-800'
          }`}
        >
          <MessageCircle className="w-5 h-5 text-white" />
          {isMinimized ? (
            <span className="text-white text-sm font-medium">Chat</span>
          ) : null}
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && !isMinimized && (
        <div className="w-80 sm:w-96 h-[500px] bg-gray-900 rounded-lg shadow-2xl border border-gray-700 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-white" />
              <span className="text-white font-semibold">Company Chat</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={minimizeChat}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <Minimize2 className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={closeChat}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-900">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
                <p>No messages yet</p>
                <p className="text-sm">Start the conversation!</p>
              </div>
            ) : (
              messages.map((message, index) => {
                const isOwnMessage = message.sender?._id === user._id;
                const senderIsExecutive = isExecutive(message.sender?.role);
                
                return (
                  <div
                    key={message._id || index}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        isOwnMessage
                          ? 'bg-blue-600 text-white'
                          : senderIsExecutive
                          ? 'bg-gradient-to-r from-amber-100 to-yellow-100 border border-amber-400 text-gray-900'
                          : 'bg-gray-800 text-gray-100'
                      }`}
                    >
                      {/* Sender info */}
                      {!isOwnMessage && (
                        <div className="flex items-center gap-1 mb-1">
                          {senderIsExecutive && (
                            <Crown className="w-3 h-3 text-amber-600" />
                          )}
                          <span className={`text-xs font-semibold ${
                            senderIsExecutive ? 'text-amber-700' : 'text-blue-400'
                          }`}>
                            {message.sender?.firstName} {message.sender?.lastName}
                          </span>
                          {senderIsExecutive && (
                            <span className="text-xs text-amber-600">
                              • {message.sender?.role}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Message content */}
                      <p
                        className={`text-sm break-words ${senderIsExecutive && !isOwnMessage ? 'text-gray-800' : ''}`}
                        dangerouslySetInnerHTML={{
                          __html: formatMessageContent(message.content),
                        }}
                      />
                      
                      {/* Timestamp */}
                      <div className={`text-xs mt-1 ${
                        isOwnMessage ? 'text-blue-200' : senderIsExecutive ? 'text-amber-600' : 'text-gray-500'
                      }`}>
                        {format(new Date(message.createdAt), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Mention Suggestions */}
          {showMentions && (
            <div className="absolute bottom-16 left-3 right-3 bg-gray-800 rounded-lg border border-gray-700 max-h-48 overflow-y-auto shadow-lg">
              <div
                onClick={() => insertMention('@all')}
                className="px-3 py-2 hover:bg-gray-700 cursor-pointer flex items-center gap-2 border-b border-gray-700"
              >
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-white font-medium">@all</span>
                <span className="text-gray-400 text-sm">Notify everyone</span>
              </div>
              {filteredUsers.slice(0, 5).map((u) => (
                <div
                  key={u._id}
                  onClick={() => insertMention(`@${u.email}`)}
                  className="px-3 py-2 hover:bg-gray-700 cursor-pointer flex items-center gap-2"
                >
                  {isExecutive(u.role) ? (
                    <Crown className="w-4 h-4 text-amber-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-gray-600 flex items-center justify-center text-xs text-white">
                      {u.firstName?.[0]}
                    </div>
                  )}
                  <div>
                    <span className={`text-sm ${
                      isExecutive(u.role) ? 'text-amber-400' : 'text-white'
                    }`}>
                      {u.firstName} {u.lastName}
                    </span>
                    <span className="text-gray-400 text-xs ml-2">{u.email}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 bg-gray-800 border-t border-gray-700">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Type a message... (use @all or @email)"
                className="flex-1 bg-gray-700 text-white placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <Send className={`w-4 h-4 text-white ${sending ? 'animate-pulse' : ''}`} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatBox;
