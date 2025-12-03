import { useState, useEffect, useCallback, useRef } from 'react';

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);

  // Structured data for journal entries
  const [entryData, setEntryData] = useState({
    title: '',
    body: '',
    tags: []
  });
  const [voiceAction, setVoiceAction] = useState(null);

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const isManualStopRef = useRef(false);
  const noSpeechTimeoutRef = useRef(null);

  // Parse voice commands from transcript
  const parseVoiceCommand = useCallback((text) => {
    const lowerText = text.toLowerCase();

    // Check for title commands
    // Pattern 1: "title is X" or "title: X"
    if (lowerText.includes('title is') || lowerText.includes('title:')) {
      const titleMatch = text.match(/title\s*(?:is|:)\s*(.+?)(?:\.|$|body|content|tags|add|publish)/i);
      if (titleMatch && titleMatch[1]) {
        const title = titleMatch[1].trim();
        setEntryData(prev => ({ ...prev, title }));
      }
    }
    // Pattern 2: "X as title" or "X as the title"
    else if (lowerText.includes('as title') || lowerText.includes('as the title')) {
      const titleMatch = text.match(/^(.+?)\s+as\s+(?:the\s+)?title/i);
      if (titleMatch && titleMatch[1]) {
        const title = titleMatch[1].trim();
        setEntryData(prev => ({ ...prev, title }));
      }
    }
    // Pattern 3: "set title to X"
    else if (lowerText.includes('set title to')) {
      const titleMatch = text.match(/set\s+title\s+to\s+(.+?)(?:\.|$|body|content|tags|add|publish)/i);
      if (titleMatch && titleMatch[1]) {
        const title = titleMatch[1].trim();
        setEntryData(prev => ({ ...prev, title }));
      }
    }

    // Check for body commands
    if (lowerText.includes('body is') || lowerText.includes('body:') ||
        lowerText.includes('content is') || lowerText.includes('content:')) {
      const bodyMatch = text.match(/(?:body|content)\s*(?:is|:)\s*(.+?)(?:\.|$|title|tags|add|publish)/i);
      if (bodyMatch && bodyMatch[1]) {
        const body = bodyMatch[1].trim();
        setEntryData(prev => ({
          ...prev,
          body: prev.body ? `${prev.body}\n${body}` : body
        }));
      }
    }
    // Pattern: "write X"
    else if (lowerText.startsWith('write ')) {
      const bodyMatch = text.match(/^write\s+(.+?)(?:\.|$|title|tags|add|publish)/i);
      if (bodyMatch && bodyMatch[1]) {
        const body = bodyMatch[1].trim();
        setEntryData(prev => ({
          ...prev,
          body: prev.body ? `${prev.body}\n${body}` : body
        }));
      }
    }
    // Pattern: "add to body X"
    else if (lowerText.includes('add to body')) {
      const bodyMatch = text.match(/add\s+to\s+body\s+(.+?)(?:\.|$|title|tags|publish)/i);
      if (bodyMatch && bodyMatch[1]) {
        const body = bodyMatch[1].trim();
        setEntryData(prev => ({
          ...prev,
          body: prev.body ? `${prev.body}\n${body}` : body
        }));
      }
    }

    // Check for tag commands
    if (lowerText.includes('add tag') || lowerText.includes('tags are') ||
        lowerText.includes('tag:') || lowerText.includes('tags:') ||
        lowerText.includes('add tags')) {
      const tagMatch = text.match(/(?:add\s+)?tags?\s*(?:are|is|:)?\s*(.+?)(?:\.|$|title|body|content|publish)/i);
      if (tagMatch && tagMatch[1]) {
        const tagText = tagMatch[1].trim();
        // Split by common separators
        const tags = tagText.split(/[,،and\s]+/)
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0 && tag.length < 50);

        setEntryData(prev => ({
          ...prev,
          tags: [...new Set([...prev.tags, ...tags])].slice(0, 10) // Max 10 unique tags
        }));
      }
    }

    // Check for publish command
    if (lowerText.includes('publish') || lowerText.includes('submit') ||
        lowerText.includes('save entry')) {
      setVoiceAction({ type: 'publish', timestamp: Date.now() });
    }

    // Check for clear command
    if (lowerText.includes('clear all') || lowerText.includes('reset') ||
        lowerText.includes('start over')) {
      setVoiceAction({ type: 'clear', timestamp: Date.now() });
    }
  }, []);

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    // Initialize speech recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      setIsListening(true);
      setError(null);
      isManualStopRef.current = false;

      // Set a timeout to show helpful message if no speech detected
      noSpeechTimeoutRef.current = setTimeout(() => {
        if (finalTranscriptRef.current === '') {
          console.log('⏰ No speech detected yet - waiting for input...');
        }
      }, 3000);
    };

    recognition.onend = () => {
      console.log('🎤 Speech recognition ended');

      // Clear the no-speech timeout
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current);
      }

      // Only show as stopped if it was a manual stop or there was an error
      if (isManualStopRef.current || error) {
        setIsListening(false);
        setInterimTranscript('');
      } else {
        // Auto-restart if it wasn't a manual stop and we're still supposed to be listening
        if (recognitionRef.current && isListening) {
          console.log('🔄 Auto-restarting speech recognition...');
          try {
            recognitionRef.current.start();
          } catch (err) {
            console.error('Failed to restart:', err);
            setIsListening(false);
            setInterimTranscript('');
          }
        } else {
          setIsListening(false);
          setInterimTranscript('');
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error);

      // Clear the no-speech timeout
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current);
      }

      let errorMessage;

      switch (event.error) {
        case 'no-speech':
          // Don't show error for no-speech, just log it
          // This is very common and not really an error
          console.log('ℹ️ No speech detected - microphone is listening...');

          // Don't set error state or stop listening
          // The recognition will auto-restart via onend handler
          return; // Exit early without setting error

        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your device.';
          isManualStopRef.current = true;
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone permission in your browser settings.';
          isManualStopRef.current = true;
          break;
        case 'network':
          errorMessage = 'Network error. Speech recognition requires internet connection.';
          isManualStopRef.current = true;
          break;
        case 'aborted':
          // Don't show error for aborted (user stopped it)
          console.log('ℹ️ Speech recognition aborted');
          return;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
          isManualStopRef.current = true;
      }

      setError(errorMessage);
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      // Clear the no-speech timeout since we got results
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current);
      }

      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      if (final) {
        finalTranscriptRef.current += final;
        setTranscript(finalTranscriptRef.current);
        // Parse voice commands from final transcript
        parseVoiceCommand(final.trim());
      }

      setInterimTranscript(interim);
    };

    recognitionRef.current = recognition;

    return () => {
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.error('Error stopping recognition:', err);
        }
      }
    };
  }, [parseVoiceCommand]);

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in your browser.');
      return;
    }

    try {
      if (recognitionRef.current && !isListening) {
        finalTranscriptRef.current = '';
        setTranscript('');
        setInterimTranscript('');
        setError(null);
        isManualStopRef.current = false;
        recognitionRef.current.start();
      }
    } catch (err) {
      console.error('Failed to start recognition:', err);

      // Handle "already started" error
      if (err.message && err.message.includes('already started')) {
        console.log('ℹ️ Recognition already running');
        setIsListening(true);
      } else {
        setError('Failed to start speech recognition. Please try again.');
      }
    }
  }, [isListening, isSupported]);

  // Stop listening
  const stopListening = useCallback(() => {
    try {
      if (recognitionRef.current && isListening) {
        isManualStopRef.current = true;

        // Clear any pending timeouts
        if (noSpeechTimeoutRef.current) {
          clearTimeout(noSpeechTimeoutRef.current);
        }

        recognitionRef.current.stop();
      }
    } catch (err) {
      console.error('Failed to stop recognition:', err);
      setError('Failed to stop speech recognition.');
      setIsListening(false);
    }
  }, [isListening]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // Clear entry data
  const clearEntryData = useCallback(() => {
    setEntryData({ title: '', body: '', tags: [] });
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';
  }, []);

  // Clear voice action
  const clearVoiceAction = useCallback(() => {
    setVoiceAction(null);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    entryData,
    voiceAction,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    clearEntryData,
    clearVoiceAction,
  };
};
