import { useState, useEffect, useCallback, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import axiosInstance from '../utils/axiosInstance';

export const useVapiJournal = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [vapiConfig, setVapiConfig] = useState(null);

  // New states for structured data
  const [entryData, setEntryData] = useState({
    title: '',
    body: '',
    tags: []
  });
  const [voiceAction, setVoiceAction] = useState(null); // For actions like 'publish'

  const vapiRef = useRef(null);

  // Fetch Vapi config from backend
  const fetchVapiConfig = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/vapi/config');
      if (response.data.success) {
        setVapiConfig(response.data.data);
        return response.data.data;
      }
    } catch (err) {
      console.error('Failed to fetch Vapi config:', err);
      // Fallback to env variables if backend fails
      const fallbackConfig = {
        publicKey: import.meta.env.REACT_APP_VAPI_PUBLIC_KEY,
        assistantId: import.meta.env.REACT_APP_VAPI_ASSISTANT_ID,
      };
      if (fallbackConfig.publicKey && fallbackConfig.assistantId) {
        setVapiConfig(fallbackConfig);
        return fallbackConfig;
      }
      setError('Voice journal feature is not configured');
      return null;
    }
  }, []);

  // Initialize Vapi instance
  useEffect(() => {
    if (vapiConfig && !vapiRef.current) {
      try {
        vapiRef.current = new Vapi(vapiConfig.publicKey);

        // Set up event listeners
        vapiRef.current.on('call-start', () => {
          console.log('📞 Call started');
          setIsConnected(true);
          setIsRecording(true);
          setError(null);
        });

        vapiRef.current.on('call-end', () => {
          console.log('📞 Call ended');
          setIsConnected(false);
          setIsRecording(false);
        });

        vapiRef.current.on('speech-start', () => {
          console.log('🎤 User started speaking');
        });

        vapiRef.current.on('speech-end', () => {
          console.log('🎤 User stopped speaking');
        });

        vapiRef.current.on('message', (message) => {
          console.log('💬 Message received:', message);

          // Handle transcript updates
          if (message.type === 'transcript' && message.transcriptType === 'final') {
            const newText = message.transcript || '';
            setTranscript(prev => prev ? `${prev} ${newText}` : newText);

            // Parse voice commands
            parseVoiceCommand(newText);
          }

          // Handle function calls from Vapi (if assistant is configured)
          if (message.type === 'function-call') {
            handleFunctionCall(message);
          }
        });

        vapiRef.current.on('error', (error) => {
          console.error('❌ Vapi error:', error);

          // Provide more specific error messages
          let errorMessage = 'Voice recording error';

          if (error.message?.includes('ended') || error.message?.includes('ejection')) {
            errorMessage = 'Voice assistant configuration issue. Please check your Vapi dashboard settings.';
          } else if (error.message?.includes('microphone') || error.message?.includes('permission')) {
            errorMessage = 'Microphone access denied. Please allow microphone permission.';
          } else if (error.message) {
            errorMessage = error.message;
          }

          setError(errorMessage);
          setIsRecording(false);
          setIsConnected(false);
        });

      } catch (err) {
        console.error('Failed to initialize Vapi:', err);
        setError('Failed to initialize voice recording');
      }
    }

    // Cleanup on unmount
    return () => {
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
        } catch (err) {
          console.error('Error stopping Vapi:', err);
        }
      }
    };
  }, [vapiConfig]);

  // Parse voice commands from transcript
  const parseVoiceCommand = useCallback((text) => {
    const lowerText = text.toLowerCase();

    // Check for title commands
    // Pattern 1: "title is X" or "title: X"
    if (lowerText.includes('title is') || lowerText.includes('title:')) {
      const titleMatch = text.match(/title\s*(?:is|:)\s*(.+?)(?:\.|$|body|tags|add)/i);
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

    // Check for body commands
    if (lowerText.includes('body is') || lowerText.includes('body:') ||
        lowerText.includes('content is') || lowerText.includes('write')) {
      const bodyMatch = text.match(/(?:body|content)\s*(?:is|:)?\s*(.+?)(?:\.|$|title|tags|add|publish)/i);
      if (bodyMatch && bodyMatch[1]) {
        const body = bodyMatch[1].trim();
        setEntryData(prev => ({ ...prev, body }));
      }
    }

    // Check for tag commands
    if (lowerText.includes('add tag') || lowerText.includes('tags are') ||
        lowerText.includes('tag:') || lowerText.includes('tags:')) {
      const tagMatch = text.match(/(?:add\s+)?tags?\s*(?:are|is|:)?\s*(.+?)(?:\.|$|title|body|publish)/i);
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

  // Handle function calls from Vapi assistant
  const handleFunctionCall = useCallback((message) => {
    const { functionCall } = message;
    if (!functionCall) return;

    const { name, parameters } = functionCall;

    switch (name) {
      case 'setTitle':
        if (parameters.title) {
          setEntryData(prev => ({ ...prev, title: parameters.title }));
        }
        break;

      case 'setBody':
        if (parameters.body) {
          setEntryData(prev => ({ ...prev, body: parameters.body }));
        }
        break;

      case 'addTags':
        if (parameters.tags && Array.isArray(parameters.tags)) {
          setEntryData(prev => ({
            ...prev,
            tags: [...new Set([...prev.tags, ...parameters.tags])].slice(0, 10)
          }));
        }
        break;

      case 'publishEntry':
        setVoiceAction({ type: 'publish', timestamp: Date.now() });
        break;

      case 'clearEntry':
        setVoiceAction({ type: 'clear', timestamp: Date.now() });
        break;

      default:
        console.log('Unknown function call:', name);
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Fetch config if not already loaded
      let config = vapiConfig;
      if (!config) {
        config = await fetchVapiConfig();
        if (!config) {
          throw new Error('Vapi configuration not available');
        }
      }

      // Initialize Vapi if needed
      if (!vapiRef.current) {
        vapiRef.current = new Vapi(config.publicKey);
      }

      // Start the call with assistant
      await vapiRef.current.start(config.assistantId);

    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(err.message || 'Failed to start voice recording');
      setIsRecording(false);
      setIsConnected(false);
    }
  }, [vapiConfig, fetchVapiConfig]);

  // Stop recording
  const stopRecording = useCallback(() => {
    try {
      if (vapiRef.current) {
        vapiRef.current.stop();
        setIsRecording(false);
        setIsConnected(false);
      }
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setError('Failed to stop voice recording');
    }
  }, []);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  // Clear all entry data
  const clearEntryData = useCallback(() => {
    setEntryData({ title: '', body: '', tags: [] });
    setTranscript('');
  }, []);

  // Clear voice action
  const clearVoiceAction = useCallback(() => {
    setVoiceAction(null);
  }, []);

  // Toggle recording
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isConnected,
    isRecording,
    transcript,
    error,
    entryData,
    voiceAction,
    startRecording,
    stopRecording,
    toggleRecording,
    clearTranscript,
    clearEntryData,
    clearVoiceAction,
    fetchVapiConfig,
  };
};
