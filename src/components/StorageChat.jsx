import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { storageApi } from '../services/api';
import toast from 'react-hot-toast';

const chatShell = {
  background: 'rgba(17, 24, 39, 0.8)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 12,
  padding: 16,
  boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  minHeight: 320
};

const chatBody = {
  flex: 1,
  overflowY: 'auto',
  padding: 10,
  background: 'rgba(15, 23, 42, 0.6)',
  borderRadius: 10,
  border: '1px solid rgba(255, 255, 255, 0.05)'
};

const chatInput = {
  flex: 1,
  padding: 12,
  borderRadius: 10,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  background: 'rgba(11, 18, 32, 0.8)',
  color: '#e2e8f0',
  outline: 'none'
};

const chatSend = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
  color: 'white',
  border: 'none',
  padding: '0 14px',
  borderRadius: 10,
  cursor: 'pointer',
  fontWeight: 600
};

const StorageChat = ({ folder, document }) => {
  const [messages, setMessages] = useState([
    {
      id: '1',
      type: 'bot',
      content: `🏛️ Welcome! I'm your PVARA Regulatory Auditor Assistant. ${document ? `I'll review "${document}" from a regulatory, legal, and policy perspective. Ask me to analyze compliance, identify gaps, or provide recommendations.` : 'Select a document to review, or ask me about your current recommendations and compliance status.'}`,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      const { data } = await storageApi.chatAboutRecommendations(folder, document, userMessage.content);
      const botMessage = {
        id: `bot-${Date.now()}`,
        type: 'bot',
        content: data.reply || 'I processed your request.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMessage]);
      if (data.applied) {
        toast.success(`Applied ${data.applied} recommendation(s)`);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Chat failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={chatShell}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <MessageSquare size={18} color="#22d3ee" />
        <div>
          <div style={{ fontWeight: 700, color: '#e2e8f0' }}>PVARA Regulatory Auditor</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Review documents from regulatory, legal & policy perspective</div>
        </div>
      </div>

      <div style={chatBody}>
        {messages.map(m => (
          <div key={m.id} style={{ marginBottom: 10, display: 'flex', justifyContent: m.type === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '75%',
              padding: '10px 12px',
              borderRadius: 12,
              background: m.type === 'user' ? 'linear-gradient(135deg, #6366f1, #22d3ee)' : 'rgba(11, 18, 32, 0.8)',
              color: '#e2e8f0',
              fontSize: 14,
              border: m.type === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
              whiteSpace: 'pre-wrap'
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#94a3b8', fontSize: 12 }}>
            <div style={{ 
              width: 16, 
              height: 16, 
              border: '2px solid rgba(255,255,255,0.1)',
              borderTop: '2px solid #22d3ee',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSendMessage()}
          placeholder="Ask to apply all pending recommendations"
          disabled={loading}
          style={chatInput}
        />
        <button
          onClick={onSendMessage}
          disabled={loading || !inputValue.trim()}
          style={{ ...chatSend, opacity: loading ? 0.7 : 1, cursor: loading || !inputValue.trim() ? 'not-allowed' : 'pointer' }}
        >
          <Send size={16} /> Send
        </button>
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default StorageChat;
