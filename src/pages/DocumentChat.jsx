import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Send, FileText, Download } from 'lucide-react';
import { storageApi } from '../services/api';
import MainLayout from '../layouts/MainLayout';

const DocumentChat = ({ documentName, folderName, onBack }) => {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [pendingFileCreation, setPendingFileCreation] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatLoading]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Load recommendations on mount
  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        const { data } = await storageApi.listRecommendations(folderName, documentName);
        if (data.trail && data.trail.length > 0) {
          const recs = data.trail[0].recommendations.map((r) => r.point);
          setRecommendations(recs);
          
          // Add initial AI message with recommendations
          if (recs.length > 0) {
            const recsText = recs.map((r, i) => `${i + 1}. ${r}`).join('\n');
            setChatMessages([{
              role: 'ai',
              text: `🏛️ **PVARA Regulatory Auditor**\n\nI've conducted an initial review of **${documentName}** and identified the following regulatory observations:\n\n${recsText}\n\n📋 **Next Steps:**\n- Ask me to analyze specific sections for compliance gaps\n- Request a legal perspective on any clause\n- Say "apply all" to generate an updated compliant document\n- Ask about PVARA requirements, KYC/AML policies, or FATF guidelines`,
              timestamp: new Date()
            }]);
          }
        } else {
          // No recommendations yet - start fresh with the welcome message
          setChatMessages([{
            role: 'ai',
            text: `🏛️ **PVARA Regulatory Auditor**\n\nI'm ready to review **${documentName}** from a regulatory, legal, and policy perspective.\n\n📋 **I can help you with:**\n- Compliance gap analysis against PVARA requirements\n- Legal review of terms, clauses, and disclaimers\n- KYC/AML policy assessment\n- FATF guideline alignment check\n- Identify missing regulatory requirements\n\nAsk me to "review this document" or ask specific questions about compliance areas.`,
            timestamp: new Date()
          }]);
        }
      } catch (err) {
        console.error('Error loading recommendations:', err);
        setChatMessages([{
          role: 'ai',
          text: `🏛️ **PVARA Regulatory Auditor**\n\nI'm ready to review **${documentName}**. Ask me to analyze this document for regulatory compliance, legal gaps, or policy alignment with PVARA requirements.`,
          timestamp: new Date()
        }]);
      }
    };
    
    loadRecommendations();
  }, [documentName, folderName]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    const lowerMsg = userMessage.toLowerCase();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage, timestamp: new Date() }]);
    setChatLoading(true);

    // Check if user wants to apply recommendations
    const isApplyRequest = 
      lowerMsg.includes('apply all') || 
      lowerMsg.includes('apply recommendations') ||
      lowerMsg.includes('update the document') ||
      lowerMsg.includes('make the changes');

    try {
      if (isApplyRequest && recommendations.length > 0) {
        // Apply recommendations to document
        const recsToApply = recommendations.map((point, idx) => ({ 
          id: `rec-${idx}`, 
          point, 
          status: 'pending'
        }));
        
        const { data } = await storageApi.applyChangesWithGPT(folderName, documentName, recsToApply);
        
        if (data.modifiedContent) {
          setPendingFileCreation({
            document: documentName,
            content: data.modifiedContent
          });
        }
        
        setChatMessages(prev => [...prev, {
          role: 'ai',
          text: `✅ **Document updated!**\n\nI've applied all ${recommendations.length} recommendations to your document.\n\n📄 New file created: **${data.newFileName || documentName.replace(/\.[^.]+$/, '_modified.txt')}**\n\nClick the green "Download Modified Document" button above to get your updated file.`,
          timestamp: new Date()
        }]);
      } else {
        // Regular chat
        const { data } = await storageApi.chatAboutRecommendations(folderName, documentName, userMessage);
        setChatMessages(prev => [...prev, { 
          role: 'ai', 
          text: data.reply || 'I understand. How can I help you further?', 
          timestamp: new Date() 
        }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setChatMessages(prev => [...prev, { 
        role: 'ai', 
        text: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pendingFileCreation) return;
    const blob = new Blob([pendingFileCreation.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = pendingFileCreation.document.replace(/\.[^.]+$/, '_modified.txt');
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatChatText = (text) => {
    // Simple markdown-like formatting
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Bold text
      let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Check if it's a numbered item
      if (/^\d+\./.test(line)) {
        return <div key={idx} style={{ marginBottom: 6 }} dangerouslySetInnerHTML={{ __html: formatted }} />;
      }
      return <div key={idx} dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(135deg, #0a0f1a 0%, #111827 50%, #0f172a 100%)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 2000
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(17, 24, 39, 0.9)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(31, 41, 55, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#e2e8f0',
            padding: '10px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
        >
          <ArrowLeft size={16} /> Back to Storage
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: 16, 
            fontWeight: 600, 
            color: '#e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <FileText style={{ color: '#3b82f6' }} size={18} />
            {documentName}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {folderName} • {recommendations.length} recommendations
          </div>
        </div>
        {pendingFileCreation && (
          <button
            onClick={handleDownload}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              color: 'white',
              padding: '10px 20px',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              fontWeight: 600,
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
            }}
          >
            <Download size={16} /> Download Modified Document
          </button>
        )}
      </div>

      {/* Chat Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        {chatMessages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div style={{
              maxWidth: '70%',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #6366f1, #22d3ee)'
                : 'rgba(30, 41, 59, 0.8)',
              color: '#f1f5f9',
              padding: '14px 18px',
              borderRadius: 12,
              fontSize: 14,
              lineHeight: 1.6,
              wordBreak: 'break-word',
              border: msg.role === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: msg.role === 'user' 
                ? '0 4px 15px rgba(99, 102, 241, 0.3)' 
                : '0 4px 15px rgba(0, 0, 0, 0.2)'
            }}>
              {formatChatText(msg.text)}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {chatLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              background: 'rgba(30, 41, 59, 0.8)',
              color: '#94a3b8',
              padding: '14px 18px',
              borderRadius: 12,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <span style={{
                display: 'inline-flex',
                gap: 4
              }}>
                <span style={{ width: 8, height: 8, background: '#22d3ee', borderRadius: '50%', animation: 'pulse 1.4s infinite ease-in-out' }} />
                <span style={{ width: 8, height: 8, background: '#22d3ee', borderRadius: '50%', animation: 'pulse 1.4s infinite ease-in-out 0.2s' }} />
                <span style={{ width: 8, height: 8, background: '#22d3ee', borderRadius: '50%', animation: 'pulse 1.4s infinite ease-in-out 0.4s' }} />
              </span>
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '16px 32px 24px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(17, 24, 39, 0.9)',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{
          display: 'flex',
          gap: 12,
          maxWidth: 900,
          margin: '0 auto'
        }}>
          <input
            ref={inputRef}
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="Ask about the document, request changes, or say 'apply all' to update..."
            style={{
              flex: 1,
              padding: '14px 18px',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 10,
              color: '#e2e8f0',
              fontSize: 14,
              outline: 'none'
            }}
            disabled={chatLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!chatInput.trim() || chatLoading}
            style={{
              background: chatInput.trim() && !chatLoading
                ? 'linear-gradient(135deg, #6366f1, #22d3ee)'
                : 'rgba(55, 65, 81, 0.8)',
              border: 'none',
              color: 'white',
              padding: '14px 24px',
              borderRadius: 10,
              cursor: chatInput.trim() && !chatLoading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              fontWeight: 600,
              opacity: chatInput.trim() && !chatLoading ? 1 : 0.5,
              boxShadow: chatInput.trim() && !chatLoading 
                ? '0 4px 15px rgba(99, 102, 241, 0.3)' 
                : 'none'
            }}
          >
            <Send size={16} /> Send
          </button>
        </div>
        <div style={{
          textAlign: 'center',
          fontSize: 11,
          color: '#475569',
          marginTop: 12
        }}>
          Try: "Summarize this document" • "What are the key compliance issues?" • "Apply all recommendations"
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default DocumentChat;
