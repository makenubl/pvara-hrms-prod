import React, { useState, useRef, useEffect, useCallback } from 'react';

// Common words dictionary for autocomplete (expandable)
const COMMON_WORDS = [
  // Business/Work terms
  'meeting', 'schedule', 'deadline', 'project', 'task', 'priority', 'urgent', 'important',
  'completed', 'pending', 'approved', 'rejected', 'review', 'feedback', 'update', 'progress',
  'department', 'employee', 'manager', 'supervisor', 'team', 'colleague', 'staff', 'personnel',
  'document', 'report', 'proposal', 'presentation', 'analysis', 'summary', 'overview',
  'budget', 'expense', 'invoice', 'payment', 'salary', 'bonus', 'allowance', 'deduction',
  'attendance', 'leave', 'vacation', 'holiday', 'sick', 'absence', 'overtime', 'shift',
  'training', 'development', 'performance', 'evaluation', 'assessment', 'appraisal',
  'recruitment', 'interview', 'candidate', 'application', 'resume', 'qualification',
  'policy', 'procedure', 'guideline', 'regulation', 'compliance', 'requirement',
  'approval', 'authorization', 'permission', 'access', 'security', 'confidential',
  'communication', 'notification', 'announcement', 'reminder', 'acknowledgment',
  'escalation', 'resolution', 'issue', 'problem', 'solution', 'action', 'decision',
  'information', 'documentation', 'verification', 'confirmation', 'clarification',
  'collaboration', 'coordination', 'cooperation', 'discussion', 'consultation',
  'implementation', 'execution', 'completion', 'submission', 'delivery', 'handover',
  'responsibility', 'accountability', 'ownership', 'delegation', 'assignment',
  'achievement', 'accomplishment', 'milestone', 'target', 'goal', 'objective',
  'improvement', 'enhancement', 'optimization', 'efficiency', 'productivity',
  'request', 'inquiry', 'query', 'response', 'reply', 'follow-up', 'followup',
  'chairman', 'chairperson', 'director', 'executive', 'officer', 'administrator',
  'dependency', 'blocker', 'bottleneck', 'constraint', 'limitation', 'challenge',
  
  // Common action words
  'please', 'kindly', 'required', 'needed', 'necessary', 'mandatory', 'optional',
  'available', 'unavailable', 'scheduled', 'postponed', 'cancelled', 'rescheduled',
  'submitted', 'received', 'processed', 'forwarded', 'assigned', 'reassigned',
  'attached', 'enclosed', 'included', 'mentioned', 'referenced', 'regarding',
  'appreciate', 'acknowledged', 'confirmed', 'verified', 'validated', 'certified',
  
  // Time-related
  'today', 'tomorrow', 'yesterday', 'weekly', 'monthly', 'quarterly', 'annually',
  'immediately', 'urgently', 'asap', 'soon', 'later', 'eventually', 'currently',
  'morning', 'afternoon', 'evening', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
  
  // Connecting words
  'however', 'therefore', 'furthermore', 'moreover', 'additionally', 'consequently',
  'accordingly', 'meanwhile', 'nevertheless', 'otherwise', 'alternatively',
  'regarding', 'concerning', 'following', 'preceding', 'subsequent',
];

// Simple Levenshtein distance for spell checking suggestions
const levenshteinDistance = (str1, str2) => {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
};

// Get autocomplete suggestions
const getAutocompleteSuggestions = (word, limit = 5) => {
  if (!word || word.length < 2) return [];
  const lowerWord = word.toLowerCase();
  
  // First, exact prefix matches
  const prefixMatches = COMMON_WORDS.filter(w => 
    w.toLowerCase().startsWith(lowerWord) && w.toLowerCase() !== lowerWord
  );
  
  if (prefixMatches.length >= limit) {
    return prefixMatches.slice(0, limit);
  }
  
  // Then, fuzzy matches for spell correction
  const fuzzyMatches = COMMON_WORDS
    .filter(w => !prefixMatches.includes(w) && w.toLowerCase() !== lowerWord)
    .map(w => ({ word: w, distance: levenshteinDistance(lowerWord, w.toLowerCase()) }))
    .filter(({ distance }) => distance <= 2) // Allow up to 2 edits
    .sort((a, b) => a.distance - b.distance)
    .map(({ word }) => word);
  
  return [...prefixMatches, ...fuzzyMatches].slice(0, limit);
};

// Get the current word being typed
const getCurrentWord = (text, cursorPosition) => {
  const beforeCursor = text.slice(0, cursorPosition);
  const words = beforeCursor.split(/\s/);
  const currentWord = words[words.length - 1] || '';
  const wordStart = beforeCursor.lastIndexOf(currentWord);
  return { word: currentWord, start: wordStart, end: cursorPosition };
};

// Smart Input Component
export const SmartInput = ({
  label,
  error,
  required = false,
  className = '',
  value = '',
  onChange,
  placeholder,
  enableAutocomplete = true,
  ...props
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const updateSuggestions = useCallback((text, position) => {
    if (!enableAutocomplete) return;
    
    const { word } = getCurrentWord(text, position);
    if (word.length >= 2) {
      const newSuggestions = getAutocompleteSuggestions(word);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
      setSelectedIndex(0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [enableAutocomplete]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    const newPosition = e.target.selectionStart;
    setCursorPosition(newPosition);
    onChange?.(e);
    updateSuggestions(newValue, newPosition);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Tab':
      case 'Enter':
        if (showSuggestions && suggestions[selectedIndex]) {
          e.preventDefault();
          applySuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const applySuggestion = (suggestion) => {
    const { word, start } = getCurrentWord(value, cursorPosition);
    const before = value.slice(0, start);
    const after = value.slice(start + word.length);
    const newValue = before + suggestion + ' ' + after;
    
    // Create synthetic event
    const syntheticEvent = {
      target: { value: newValue, name: inputRef.current?.name }
    };
    onChange?.(syntheticEvent);
    setShowSuggestions(false);
    
    // Focus back and set cursor position
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPosition = start + suggestion.length + 1;
        inputRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-2 relative">
      {label && (
        <label className="block text-sm font-semibold text-slate-200">
          {label}
          {required && <span className="text-rose-400">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          spellCheck={true}
          autoComplete="off"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={placeholder}
          className={`w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/60 focus:border-cyan-300/50 transition ${
            error ? 'border-rose-400/60 focus:ring-rose-400/70' : ''
          } ${className}`}
          {...props}
        />
        
        {/* Autocomplete Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-slate-800 border border-white/20 rounded-xl shadow-2xl overflow-hidden"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => applySuggestion(suggestion)}
                className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                  index === selectedIndex
                    ? 'bg-cyan-500/30 text-cyan-100'
                    : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                {suggestion}
              </button>
            ))}
            <div className="px-3 py-1.5 text-xs text-slate-500 border-t border-white/10 bg-slate-900/50">
              ↑↓ Navigate • Tab/Enter to select • Esc to close
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-rose-300">{error}</p>}
    </div>
  );
};

// Smart Textarea Component
export const SmartTextarea = ({
  label,
  error,
  required = false,
  className = '',
  value = '',
  onChange,
  placeholder,
  rows = 3,
  enableAutocomplete = true,
  ...props
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef(null);
  const suggestionsRef = useRef(null);

  const updateSuggestions = useCallback((text, position) => {
    if (!enableAutocomplete) return;
    
    const { word } = getCurrentWord(text, position);
    if (word.length >= 2) {
      const newSuggestions = getAutocompleteSuggestions(word);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
      setSelectedIndex(0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [enableAutocomplete]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    const newPosition = e.target.selectionStart;
    setCursorPosition(newPosition);
    onChange?.(e);
    updateSuggestions(newValue, newPosition);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        if (e.altKey) {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % suggestions.length);
        }
        break;
      case 'ArrowUp':
        if (e.altKey) {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        }
        break;
      case 'Tab':
        if (showSuggestions && suggestions[selectedIndex]) {
          e.preventDefault();
          applySuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const applySuggestion = (suggestion) => {
    const { word, start } = getCurrentWord(value, cursorPosition);
    const before = value.slice(0, start);
    const after = value.slice(start + word.length);
    const newValue = before + suggestion + ' ' + after;
    
    const syntheticEvent = {
      target: { value: newValue, name: textareaRef.current?.name }
    };
    onChange?.(syntheticEvent);
    setShowSuggestions(false);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPosition = start + suggestion.length + 1;
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
          textareaRef.current && !textareaRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-2 relative">
      {label && (
        <label className="block text-sm font-semibold text-slate-200">
          {label}
          {required && <span className="text-rose-400">*</span>}
        </label>
      )}
      <div className="relative">
        <textarea
          ref={textareaRef}
          spellCheck={true}
          autoComplete="off"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={placeholder}
          rows={rows}
          className={`w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/60 focus:border-cyan-300/50 transition resize-none ${
            error ? 'border-rose-400/60 focus:ring-rose-400/70' : ''
          } ${className}`}
          {...props}
        />
        
        {/* Autocomplete Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-slate-800 border border-white/20 rounded-xl shadow-2xl overflow-hidden"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => applySuggestion(suggestion)}
                className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                  index === selectedIndex
                    ? 'bg-cyan-500/30 text-cyan-100'
                    : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                {suggestion}
              </button>
            ))}
            <div className="px-3 py-1.5 text-xs text-slate-500 border-t border-white/10 bg-slate-900/50">
              Tab to select • Esc to close
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-rose-300">{error}</p>}
    </div>
  );
};

export default { SmartInput, SmartTextarea };
