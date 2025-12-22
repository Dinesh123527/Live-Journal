import { ArrowLeft, Bold, Check, ChevronDown, Cloud, CloudOff, Globe, Italic, Lightbulb, List, ListOrdered, Loader, Lock, Plus, Send, Sparkles, Tag, Wand2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal.jsx';
import MoodDetector from '../../components/MoodDetector/MoodDetector.jsx';
import Navbar from '../../components/Navbar/Navbar.jsx';
import WritingPromptsPanel from '../../components/WritingPromptsPanel/WritingPromptsPanel.jsx';
import axiosInstance from '../../utils/axiosInstance';
import { replaceMathWithResult } from '../../utils/mathCalculator';
import './EntryEditor.scss';

// localStorage key for persisting entry data
const LOCAL_STORAGE_KEY = 'livejournal_entry_draft';

const EntryEditor = () => {
  const navigate = useNavigate();
  const { draftId, id: entryId } = useParams();
  const isEditMode = !!entryId;
  const isDraftMode = !!draftId;

  // Helper to get initial state from localStorage for new entries
  const getInitialState = () => {
    // Only restore from localStorage for new entries (not edit or draft mode)
    if (!entryId && !draftId) {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (e) {
        console.error('Error reading from localStorage:', e);
      }
    }
    return null;
  };

  const savedState = getInitialState();

  // Form states - restore from localStorage if available
  const [title, setTitle] = useState(savedState?.title || '');
  const [body, setBody] = useState(savedState?.body || '');
  const [tags, setTags] = useState(savedState?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isPrivate, setIsPrivate] = useState(savedState?.isPrivate ?? true);

  // Draft states
  const [currentDraftId, setCurrentDraftId] = useState(draftId || null);

  // UI states
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Auto-save states
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved'); // 'saved', 'unsaved', 'saving', 'error'
  const autoSaveTimerRef = useRef(null);
  const lastSavedDataRef = useRef({ title: '', body: '', tags: [], isPrivate: true });

  // Confirm Modal states
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'warning',
    confirmText: 'Confirm',
    confirmButtonStyle: 'primary'
  });

  const [userInfo, setUserInfo] = useState(null);

  const bodyTextareaRef = useRef(null);
  const lastBodyValueRef = useRef('');

  // AI Rewrite states
  const [showRewriteMenu, setShowRewriteMenu] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [rewriteResult, setRewriteResult] = useState(null);
  const [rewriteStyle, setRewriteStyle] = useState(null);
  const rewriteMenuRef = useRef(null);

  // AI Auto-Tagging states
  const [suggestingTags, setSuggestingTags] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState([]);

  // AI Mood Detection states
  const [detectedMoodLabel, setDetectedMoodLabel] = useState(null);
  const [detectedMoodScore, setDetectedMoodScore] = useState(null);

  // AI Writing Prompts states
  const [showPromptsPanel, setShowPromptsPanel] = useState(false);


  // Track if there's content in the editor - needs to recalculate on body change
  const hasContent = useMemo(() => {
    // Get clean text content from body
    const editor = bodyTextareaRef.current;
    const bodyText = editor ? (editor.textContent || editor.innerText || '').trim() : body.replace(/<[^>]*>/g, '').trim();
    return title.trim() !== '' || bodyText !== '';
  }, [title, body]);

  const getTextContent = () => {
    const editor = bodyTextareaRef.current;
    if (!editor) return '';
    return editor.textContent || editor.innerText || '';
  };

  const calculateCounts = () => {
    const text = getTextContent().trim();
    const charCount = text.length;
    const wordCount = text === '' ? 0 : text.split(/\s+/).filter(word => word.length > 0).length;

    const readingTime = wordCount > 0 ? Math.ceil(wordCount / 200) : 0;

    const sentenceCount = text === '' ? 0 : text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

    const paragraphCount = text === '' ? 0 : text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;

    return { wordCount, charCount, readingTime, sentenceCount, paragraphCount };
  };

  const counts = calculateCounts();

  // Handle body change for contentEditable
  const handleBodyChange = useCallback(() => {
    const editor = bodyTextareaRef.current;
    if (!editor) return;

    const newValue = editor.innerHTML;

    if (newValue !== lastBodyValueRef.current) {
      setBody(newValue);
      lastBodyValueRef.current = newValue;
    }
  }, []);

  // Formatting handlers
  const applyFormatting = useCallback((command) => {
    const editor = bodyTextareaRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand(command, false, null);

    // Trigger input event to update state
    handleBodyChange();
  }, [handleBodyChange]);

  // Close rewrite menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rewriteMenuRef.current && !rewriteMenuRef.current.contains(event.target)) {
        setShowRewriteMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle AI rewrite
  const handleRewrite = async (style) => {
    const textContent = getTextContent().trim();
    if (!textContent || textContent.length < 20) {
      setError('Please write at least 20 characters to use AI rewrite');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setShowRewriteMenu(false);
    setRewriting(true);
    setRewriteStyle(style);
    setRewriteResult(null);

    try {
      const response = await axiosInstance.post('/ai/rewrite', {
        text: textContent,
        style: style
      });

      if (response.data && response.data.result) {
        setRewriteResult(response.data.result);
      } else {
        throw new Error('No result received');
      }
    } catch (err) {
      console.error('Rewrite error:', err);
      setError(err.response?.data?.error || 'Failed to rewrite text. Please try again.');
      setTimeout(() => setError(null), 4000);
    } finally {
      setRewriting(false);
    }
  };

  // Accept rewritten text
  const acceptRewrite = () => {
    if (rewriteResult && bodyTextareaRef.current) {
      bodyTextareaRef.current.innerHTML = rewriteResult;
      setBody(rewriteResult);
      lastBodyValueRef.current = rewriteResult;
      setRewriteResult(null);
      setRewriteStyle(null);
      setSuccess('Text rewritten successfully!');
      setTimeout(() => setSuccess(null), 2000);
    }
  };

  // Reject rewritten text
  const rejectRewrite = () => {
    setRewriteResult(null);
    setRewriteStyle(null);
  };

  // AI Auto-Tagging: Request tag suggestions from AI
  const handleSuggestTags = async () => {
    const textContent = getTextContent().trim();
    if (!textContent || textContent.length < 20) {
      setError('Please write at least 20 characters to get tag suggestions');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setSuggestingTags(true);
    setSuggestedTags([]);

    try {
      const response = await axiosInstance.post('/ai/tags', {
        text: textContent,
        limit: 8
      });

      if (response.data && response.data.tags && response.data.tags.length > 0) {
        // Filter out tags that are already added
        const existingTagsLower = tags.map(t => t.toLowerCase());
        const newSuggestions = response.data.tags.filter(
          tag => !existingTagsLower.includes(tag.toLowerCase())
        );

        if (newSuggestions.length > 0) {
          setSuggestedTags(newSuggestions);
        } else {
          setSuccess('All suggested tags are already added!');
          setTimeout(() => setSuccess(null), 2000);
        }
      } else {
        setError('No tag suggestions available for this content');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error('Tag suggestion error:', err);
      setError(err.response?.data?.error || 'Failed to get tag suggestions');
      setTimeout(() => setError(null), 4000);
    } finally {
      setSuggestingTags(false);
    }
  };

  // Accept a single suggested tag
  const acceptSuggestedTag = (tag) => {
    if (tags.length >= 10) {
      setError('Maximum 10 tags allowed');
      setTimeout(() => setError(null), 3000);
      return;
    }
    setTags([...tags, tag]);
    setSuggestedTags(suggestedTags.filter(t => t !== tag));
  };

  // Reject a single suggested tag
  const rejectSuggestedTag = (tag) => {
    setSuggestedTags(suggestedTags.filter(t => t !== tag));
  };

  // Accept all suggested tags
  const acceptAllSuggestedTags = () => {
    const remainingSlots = 10 - tags.length;
    if (remainingSlots <= 0) {
      setError('Maximum 10 tags allowed');
      setTimeout(() => setError(null), 3000);
      return;
    }
    const tagsToAdd = suggestedTags.slice(0, remainingSlots);
    setTags([...tags, ...tagsToAdd]);
    setSuggestedTags([]);
    setSuccess(`Added ${tagsToAdd.length} tags!`);
    setTimeout(() => setSuccess(null), 2000);
  };

  // AI Mood Detection handler
  const handleMoodDetected = (moodLabel, moodScore) => {
    setDetectedMoodLabel(moodLabel);
    setDetectedMoodScore(moodScore);
    setSuccess(`Mood set to ${moodLabel}`);
    setTimeout(() => setSuccess(null), 2000);
  };

  // AI Writing Prompts handler
  const handleSelectPrompt = (promptText, category) => {
    if (!title.trim()) {
      setTitle(promptText);
    } else {
      // Insert at beginning of body
      const currentBody = body || '';
      const newBody = `<p><em>${promptText}</em></p>${currentBody}`;
      setBody(newBody);
      if (bodyTextareaRef.current) {
        bodyTextareaRef.current.innerHTML = newBody;
        lastBodyValueRef.current = newBody;
      }
    }
    setShowPromptsPanel(false);
    setSuccess('Prompt added to your entry!');
    setTimeout(() => setSuccess(null), 2000);
  };

  // Fetch user info on mount
  useEffect(() => {
    const fetchUserInfo = () => {
      try {
        // Try to get from localStorage first
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setUserInfo(user);
        } else {
          // Fallback: create user object from available data
          setUserInfo({
            username: localStorage.getItem('username') || 'User',
            email: localStorage.getItem('email') || '',
            id: localStorage.getItem('userId') || ''
          });
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        // Set default user info
        setUserInfo({
          username: 'User',
          email: '',
          id: ''
        });
      }
    };

    fetchUserInfo();
  }, []);

  // Update body editor content when body state changes (for initial load)
  useEffect(() => {
    const editor = bodyTextareaRef.current;
    if (!editor) return;

    // Only update if different from what's currently in the editor
    if (editor.innerHTML !== body && body !== lastBodyValueRef.current) {
      editor.innerHTML = body;
      lastBodyValueRef.current = body;
    }
  }, [body]);

  // Persist form data to localStorage immediately on every change (for new entries only)
  useEffect(() => {
    // Only persist for new entries (not edit or draft mode with existing ID)
    if (!isEditMode && !isDraftMode) {
      const dataToSave = {
        title,
        body,
        tags,
        isPrivate,
        savedAt: new Date().toISOString()
      };

      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
      } catch (e) {
        console.error('Error saving to localStorage:', e);
      }
    }
  }, [title, body, tags, isPrivate, isEditMode, isDraftMode]);

  // Keyboard shortcuts for formatting
  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          document.execCommand('bold', false, null);
          break;
        case 'i':
          e.preventDefault();
          document.execCommand('italic', false, null);
          break;
        default:
          break;
      }
    }



    // Handle math calculation only when "=" is pressed
    if (e.key === '=') {
      const editor = bodyTextareaRef.current;
      if (!editor) return;

      // Get the current text content
      const textContent = editor.textContent || '';

      // Get cursor position
      const selection = window.getSelection();
      if (!selection.rangeCount) return;

      let cursorPosition;
      try {
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(editor);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        cursorPosition = preCaretRange.toString().length;
      } catch {
        return;
      }

      // Find the start of the current line
      const beforeCursor = textContent.substring(0, cursorPosition);
      const lastNewlineIndex = beforeCursor.lastIndexOf('\n');
      const lineStart = lastNewlineIndex + 1;
      const currentLine = textContent.substring(lineStart, cursorPosition);

      // Look for a math expression at the end of the line
      // This regex finds sequences like "5*6" or "10+20-5" at the end
      // It allows text before it like "Hello I spend 5*6"
      const mathExpressionMatch = currentLine.match(/([\d+\-*/().\s]+)$/);

      if (!mathExpressionMatch) {
        return; // No math expression found at cursor position
      }

      const potentialExpression = mathExpressionMatch[1].trim();

      // Must have at least one operator to be a math expression
      if (!/[+\-*/]/.test(potentialExpression)) {
        return; // No operators, just a number or text
      }

      // Must be a valid math expression (only numbers, operators, spaces, parentheses)
      if (!/^[\d+\-*/().\s]+$/.test(potentialExpression)) {
        return; // Contains invalid characters for math
      }

      // Use setTimeout to let the "=" character be inserted first
      setTimeout(() => {
        const editor = bodyTextareaRef.current;
        if (!editor) return;

        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        // Try to calculate
        const expression = potentialExpression;
        if (!expression || expression === '=') {
          return;
        }

        const result = replaceMathWithResult(expression + '=', expression.length + 1);

        if (!result.calculated) {
          return; // Invalid expression, do nothing
        }

        // Extract just the result number from the calculated text
        const resultMatch = result.text.match(/=\s*(-?\d+\.?\d*)/);
        if (!resultMatch) {
          return;
        }

        const resultValue = resultMatch[1];

        try {
          // Insert the result
          const textToInsert = ' ' + resultValue;
          document.execCommand('insertText', false, textToInsert);

          // Update state
          setTimeout(() => {
            setBody(editor.innerHTML);
            lastBodyValueRef.current = editor.innerHTML;
          }, 0);
        } catch (err) {
          console.error('Error inserting result:', err);
        }
      }, 0);
    }
  }, []);

  // Load draft or entry data
  useEffect(() => {
    const fetchData = async () => {
      setError(null);

      try {
        if (isDraftMode && currentDraftId) {
          // Load draft data
          const response = await axiosInstance.get(`/drafts/${currentDraftId}`);
          const draftData = response.data;

          setTitle(draftData.title || '');
          setBody(draftData.body || '');
          setTags(Array.isArray(draftData.tags) ? draftData.tags : (draftData.tags ? JSON.parse(draftData.tags) : []));
          setIsPrivate(draftData.is_private !== undefined ? Boolean(draftData.is_private) : true);
          setCurrentDraftId(draftData.id);
        } else if (isEditMode && entryId) {
          // Load entry data for editing
          const response = await axiosInstance.get(`/entries/${entryId}`);
          const entryData = response.data;

          setTitle(entryData.title || '');
          setBody(entryData.body || '');
          // Handle tags parsing
          let parsedTags = [];
          if (Array.isArray(entryData.tags)) {
            parsedTags = entryData.tags;
          } else if (typeof entryData.tags === 'string') {
            try {
              parsedTags = JSON.parse(entryData.tags);
            } catch {
              parsedTags = entryData.tags.split(',').map(t => t.trim()).filter(Boolean);
            }
          }
          setTags(parsedTags);
          setIsPrivate(entryData.is_private !== undefined ? Boolean(entryData.is_private) : true);
          setCurrentDraftId(null);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load data. Please try again.');
      }
    };

    fetchData();
  }, [isDraftMode, currentDraftId, isEditMode, entryId]);

  // Publish entry
  const handlePublish = async () => {
    if (!body.trim()) {
      setError('Entry body cannot be empty');
      return;
    }

    setPublishing(true);
    setError(null);
    setSuccess(null);

    try {
      if (isEditMode && entryId) {
        // Update existing entry
        await axiosInstance.put(`/entries/${entryId}`, {
          title: title || null,
          body,
          tags,
          is_private: isPrivate ? 1 : 0
        });
        setSuccess('Entry updated successfully');
      } else if (isDraftMode && currentDraftId) {
        // Publish draft
        await axiosInstance.post(`/drafts/${currentDraftId}/publish`, {
          title: title || null,
          tags,
          is_private: isPrivate ? 1 : 0
        });
        setSuccess('Entry published successfully');
      } else {
        // Create new entry directly
        await axiosInstance.post('/entries', {
          title: title || null,
          body,
          tags,
          is_private: isPrivate ? 1 : 0
        });
        setSuccess('Entry created successfully');
      }

      // Clear localStorage after successful publish
      localStorage.removeItem(LOCAL_STORAGE_KEY);

      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error publishing entry:', error);
      setError(error.response?.data?.error || 'Failed to publish entry');
    } finally {
      setPublishing(false);
    }
  };

  // Delete draft
  const handleDeleteDraft = async () => {
    if (!currentDraftId) return;

    setError(null);
    setSuccess(null);

    try {
      await axiosInstance.delete(`/drafts/${currentDraftId}`);

      setSuccess('Draft deleted successfully');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error deleting draft:', error);
      setError('Failed to delete draft');
    }
  };

  // Confirm modal handlers
  const openConfirmModal = (type, onConfirm) => {
    setConfirmModal({
      isOpen: true,
      title: type === 'delete' ? 'Delete Draft' : type === 'cancel' ? 'Discard Changes' : 'Discard Changes',
      message: type === 'delete' ? 'Are you sure you want to delete this draft?' : type === 'cancel' ? 'Are you sure you want to discard your changes? This action cannot be undone.' : 'Are you sure you want to discard your changes?',
      onConfirm: () => {
        onConfirm();
        closeConfirmModal();
      },
      type: type === 'delete' ? 'danger' : 'warning',
      confirmText: type === 'delete' ? 'Delete' : 'Discard',
      confirmButtonStyle: type === 'delete' ? 'danger' : 'primary'
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal({
      ...confirmModal,
      isOpen: false
    });
  };

  // Handle cancel with confirmation if there's content
  const handleCancel = () => {
    if (hasContent) {
      openConfirmModal('cancel', () => {
        // Clear localStorage for new entries when discarding
        if (!isEditMode && !isDraftMode) {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
        navigate('/dashboard');
      });
    } else {
      navigate('/dashboard');
    }
  };

  // Handle back navigation with confirmation if there's content
  const handleBack = () => {
    if (hasContent) {
      openConfirmModal('cancel', () => {
        // Clear localStorage for new entries when discarding
        if (!isEditMode && !isDraftMode) {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
        navigate('/dashboard');
      });
    } else {
      navigate('/dashboard');
    }
  };

  useEffect(() => {
    const hasChanges =
      title !== lastSavedDataRef.current.title ||
      body !== lastSavedDataRef.current.body ||
      JSON.stringify(tags) !== JSON.stringify(lastSavedDataRef.current.tags) ||
      isPrivate !== lastSavedDataRef.current.isPrivate;

    if (hasChanges && hasContent) {
      setAutoSaveStatus('unsaved');
    }

    const handleAutoSave = async () => {
      if (!hasContent || !body.trim()) {
        setAutoSaveStatus('saved');
        return;
      }

      setAutoSaveStatus('saving');

      try {
        if (isEditMode && entryId) {
          // Update existing entry
          await axiosInstance.put(`/entries/${entryId}`, {
            title: title || null,
            body,
            tags,
            is_private: isPrivate ? 1 : 0
          });
          setAutoSaveStatus('saved');
          lastSavedDataRef.current = { title, body, tags, isPrivate };
        } else if (isDraftMode && currentDraftId) {
          // Update draft using PUT endpoint
          await axiosInstance.put(`/drafts/${currentDraftId}`, {
            title: title || null,
            body,
            tags,
            is_private: isPrivate ? 1 : 0
          });
          setAutoSaveStatus('saved');
          lastSavedDataRef.current = { title, body, tags, isPrivate };
        } else {
          // Create new draft for new entries
          const response = await axiosInstance.post('/drafts', {
            title: title || null,
            body,
            tags,
            is_private: isPrivate ? 1 : 0
          });

          if (response.data && response.data.draft && response.data.draft.id) {
            setCurrentDraftId(response.data.draft.id);
            // Clear localStorage once draft is successfully created on server
            localStorage.removeItem(LOCAL_STORAGE_KEY);
          }
          setAutoSaveStatus('saved');
          lastSavedDataRef.current = { title, body, tags, isPrivate };
        }
      } catch (error) {
        console.error('Error during auto-save:', error);
        setAutoSaveStatus('error');
      }
    };

    // Debounce auto-save to 3 seconds
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    if (hasChanges && hasContent) {
      autoSaveTimerRef.current = setTimeout(() => {
        handleAutoSave();
      }, 3000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [title, body, tags, isPrivate, hasContent, isEditMode, entryId, isDraftMode, currentDraftId]);

  return (
    <div className="entry-editor-page">
      <Navbar
        showAuthButtons={false}
        isAuthenticated={true}
        userProfileInfo={userInfo}
      />
      <div className="editor-container">
        <div className="editor-header">
          <button className="back-btn" onClick={handleBack}>
            <span className="back-btn-icon">
              <ArrowLeft size={20} />
            </span>
            <span className="back-btn-text">Back to Dashboard</span>
            <span className="back-btn-hover-effect"></span>
          </button>
          <h1>{isEditMode ? 'Edit Entry' : isDraftMode ? 'Edit Draft' : 'New Entry'}</h1>
          <div className="header-actions">
            {isDraftMode && (
              <button className="btn btn-danger" onClick={() => openConfirmModal('delete', handleDeleteDraft)}>
                <X size={18} /> Delete Draft
              </button>
            )}
            {/* Auto-save indicator in header */}
            <div className={`auto-save-indicator status-${autoSaveStatus}`}>
              {autoSaveStatus === 'unsaved' && (
                <>
                  <Cloud size={16} />
                  <span>Unsaved changes</span>
                </>
              )}
              {autoSaveStatus === 'saving' && (
                <>
                  <Loader size={16} className="spinner" />
                  <span>Autosaving...</span>
                </>
              )}
              {autoSaveStatus === 'saved' && (
                <>
                  <Cloud size={16} />
                  <span>Changes saved</span>
                </>
              )}
              {autoSaveStatus === 'error' && (
                <>
                  <CloudOff size={16} />
                  <span>Save failed</span>
                </>
              )}
            </div>
          </div>
          <div className="private-toggle">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="toggle-input"
            />
            <label htmlFor="isPrivate" className="toggle-label">
              {isPrivate ? <Lock size={16} /> : <Globe size={16} />}
              <span className="toggle-text">{isPrivate ? 'Private' : 'Public'}</span>
            </label>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X size={18} />
            </button>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <span>{success}</span>
            <button onClick={() => setSuccess(null)}>
              <X size={18} />
            </button>
          </div>
        )}

        {/* AI Writing Prompts Toggle & Panel */}
        {!hasContent && !showPromptsPanel && (
          <button
            className="prompts-toggle-btn"
            onClick={() => setShowPromptsPanel(true)}
          >
            <Lightbulb size={18} />
            <span>Need inspiration? Get AI writing prompts</span>
            <Sparkles size={14} className="sparkle-icon" />
          </button>
        )}

        {showPromptsPanel && (
          <WritingPromptsPanel
            onSelectPrompt={handleSelectPrompt}
            onClose={() => setShowPromptsPanel(false)}
            isVisible={showPromptsPanel}
          />
        )}

        <div className="editor-form">
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              className="title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your journal title..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="body">Body</label>
            <div className="rich-text-toolbar">
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => applyFormatting('bold')}
                title="Bold (Ctrl+B)"
                aria-label="Bold"
              >
                <Bold size={18} />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => applyFormatting('italic')}
                title="Italic (Ctrl+I)"
                aria-label="Italic"
              >
                <Italic size={18} />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => applyFormatting('insertUnorderedList')}
                title="Bullet List"
                aria-label="Bullet List"
              >
                <List size={18} />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => applyFormatting('insertOrderedList')}
                title="Numbered List"
                aria-label="Numbered List"
              >
                <ListOrdered size={18} />
              </button>

              {/* Divider */}
              <div className="toolbar-divider"></div>

              {/* AI Rewrite Button */}
              <div className="rewrite-dropdown" ref={rewriteMenuRef}>
                <button
                  type="button"
                  className={`toolbar-btn rewrite-btn ${showRewriteMenu ? 'active' : ''} ${rewriting ? 'loading' : ''}`}
                  onClick={() => setShowRewriteMenu(!showRewriteMenu)}
                  title="AI Rewrite (TensorFlow ML)"
                  aria-label="AI Rewrite"
                  disabled={rewriting}
                >
                  {rewriting ? (
                    <Loader size={18} className="spinner" />
                  ) : (
                    <>
                      <Wand2 size={18} />
                      <ChevronDown size={12} className="chevron" />
                    </>
                  )}
                </button>

                {showRewriteMenu && (
                  <div className="rewrite-menu">
                    <div className="rewrite-menu-header">
                      <Sparkles size={16} />
                      <span>AI Text Rewrite</span>
                    </div>
                    <button
                      type="button"
                      className="rewrite-option"
                      onClick={() => handleRewrite('concise')}
                    >
                      <span className="option-icon">✨</span>
                      <div className="option-content">
                        <span className="option-title">Concise</span>
                        <span className="option-desc">Make text shorter & clearer</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="rewrite-option"
                      onClick={() => handleRewrite('positive')}
                    >
                      <span className="option-icon">😊</span>
                      <div className="option-content">
                        <span className="option-title">Positive</span>
                        <span className="option-desc">Transform to positive tone</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="rewrite-option"
                      onClick={() => handleRewrite('reflective')}
                    >
                      <span className="option-icon">🔮</span>
                      <div className="option-content">
                        <span className="option-title">Reflective</span>
                        <span className="option-desc">Add introspective framing</span>
                      </div>
                    </button>
                    <div className="rewrite-menu-footer">
                      <span>Powered by TensorFlow ML</span>
                    </div>
                  </div>
                )}
              </div>

            </div>
            <div
              id="body"
              className="body-input rich-editor"
              contentEditable
              ref={bodyTextareaRef}
              onInput={handleBodyChange}
              onKeyDown={handleKeyDown}
              suppressContentEditableWarning={true}
              data-placeholder="Start writing your thoughts... (Use Ctrl+B for bold, Ctrl+I for italic, type math expressions like '2+2=' for calculations)"
              role="textbox"
              aria-label="Entry body"
              aria-multiline="true"
            />
            <div className="editor-stats">
              <span className="stat-item">
                <strong>{counts.wordCount}</strong> {counts.wordCount === 1 ? 'word' : 'words'}
              </span>
              <span className="stat-separator">•</span>
              <span className="stat-item">
                <strong>{counts.charCount}</strong> {counts.charCount === 1 ? 'character' : 'characters'}
              </span>
              <span className="stat-separator">•</span>
              <span className="stat-item">
                <strong>{counts.sentenceCount}</strong> {counts.sentenceCount === 1 ? 'sentence' : 'sentences'}
              </span>
              <span className="stat-separator">•</span>
              <span className="stat-item">
                <strong>{counts.paragraphCount}</strong> {counts.paragraphCount === 1 ? 'paragraph' : 'paragraphs'}
              </span>
              <span className="stat-separator">•</span>
              <span className="stat-item">
                <strong>{counts.readingTime}</strong> {counts.readingTime === 1 ? 'min read' : 'min read'}
              </span>
            </div>

            {/* AI Rewrite Preview Panel */}
            {rewriteResult && (
              <div className="rewrite-preview-panel">
                <div className="preview-header">
                  <div className="preview-title">
                    <Sparkles size={18} />
                    <span>AI Rewrite Preview</span>
                    <span className="style-badge">
                      {rewriteStyle === 'concise' && '✨ Concise'}
                      {rewriteStyle === 'positive' && '😊 Positive'}
                      {rewriteStyle === 'reflective' && '🔮 Reflective'}
                    </span>
                  </div>
                  <div className="preview-actions">
                    <button
                      type="button"
                      className="preview-btn accept"
                      onClick={acceptRewrite}
                      title="Accept rewritten text"
                    >
                      <Check size={16} />
                      <span>Accept</span>
                    </button>
                    <button
                      type="button"
                      className="preview-btn reject"
                      onClick={rejectRewrite}
                      title="Reject and keep original"
                    >
                      <X size={16} />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
                <div className="preview-content">
                  <p>{rewriteResult}</p>
                </div>
              </div>
            )}

            {/* AI Mood Detection */}
            <MoodDetector
              text={getTextContent()}
              onMoodDetected={handleMoodDetected}
              currentMood={detectedMoodLabel}
              disabled={isEditMode}
              debounceMs={2500}
            />
          </div>

          <div className="form-group tags-group">
            <div className="tags-header">
              <div className="tags-title-section">
                <label htmlFor="tags">
                  <Tag size={18} />
                  <span className="tags-title-text">Tags</span>
                  <span className="ai-badge">
                    <Sparkles size={10} />
                    AI
                  </span>
                </label>
              </div>
              <span className={`tags-counter ${tags.length >= 10 ? 'limit-reached' : ''}`}>
                {tags.length}/10
              </span>
            </div>
            <div className="tags-input-container">
              <input
                type="text"
                id="tags"
                className="tags-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagInput.trim() !== '') {
                    e.preventDefault();
                    if (tags.length < 10) {
                      setTags([...tags, tagInput.trim()]);
                      setTagInput('');
                    } else {
                      setError('Maximum 10 tags allowed');
                      setTimeout(() => setError(null), 3000);
                    }
                  }
                }}
                placeholder={tags.length >= 10 ? "Maximum tags reached" : "Type tag and press Enter or click Add"}
                disabled={tags.length >= 10}
              />
              <button
                className="add-tag-btn"
                onClick={() => {
                  if (tagInput.trim() !== '' && tags.length < 10) {
                    setTags([...tags, tagInput.trim()]);
                    setTagInput('');
                  } else if (tags.length >= 10) {
                    setError('Maximum 10 tags allowed');
                    setTimeout(() => setError(null), 3000);
                  }
                }}
                disabled={!tagInput.trim() || tags.length >= 10}
                type="button"
                title={tags.length >= 10 ? "Maximum tags reached" : "Add Tag"}
              >
                <Plus size={18} />
                <span>Add</span>
              </button>
              <button
                className={`suggest-tags-btn ${suggestingTags ? 'loading' : ''}`}
                onClick={handleSuggestTags}
                disabled={suggestingTags || tags.length >= 10 || body.replace(/<[^>]*>/g, '').trim().length < 20}
                type="button"
                title={body.replace(/<[^>]*>/g, '').trim().length < 20 ? "Write at least 20 characters to get tag suggestions" : "AI Suggest Tags"}
              >
                {suggestingTags ? (
                  <Loader size={18} className="spinner" />
                ) : (
                  <Sparkles size={18} />
                )}
                <span>{suggestingTags ? 'Suggesting...' : 'Suggest'}</span>
              </button>
            </div>

            {/* AI Suggested Tags Panel */}
            {suggestedTags.length > 0 && (
              <div className="suggested-tags-panel">
                <div className="suggested-tags-header">
                  <div className="suggested-tags-title">
                    <Sparkles size={16} />
                    <span>AI Suggested Tags</span>
                  </div>
                  <button
                    type="button"
                    className="accept-all-btn"
                    onClick={acceptAllSuggestedTags}
                    disabled={tags.length >= 10}
                  >
                    <Check size={14} />
                    <span>Accept All</span>
                  </button>
                </div>
                <div className="suggested-tags-list">
                  {suggestedTags.map((tag, index) => (
                    <span key={index} className="suggested-tag">
                      <span className="suggested-tag-text">{tag}</span>
                      <button
                        type="button"
                        className="suggested-tag-accept"
                        onClick={() => acceptSuggestedTag(tag)}
                        title="Accept tag"
                        disabled={tags.length >= 10}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        className="suggested-tag-reject"
                        onClick={() => rejectSuggestedTag(tag)}
                        title="Reject tag"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {tags.length > 0 && (
              <div className="tags-list">
                {tags.map((tag, index) => (
                  <span key={index} className="tag">
                    <span className="tag-text">{tag}</span>
                    <button
                      className="tag-remove-btn"
                      onClick={() => setTags(tags.filter((_, i) => i !== index))}
                      aria-label={`Remove tag ${tag}`}
                      title="Remove tag"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="tags-info">
              <p className="helper-text">
                {tags.length === 0 ? 'Add tags to categorize your entry' :
                  tags.length >= 10 ? 'Maximum tags reached' :
                    `${10 - tags.length} more tag${10 - tags.length === 1 ? '' : 's'} available`}</p>
            </div>
          </div>

          <div className="form-actions">
            {hasContent && (
              <button
                className="discard-btn"
                onClick={handleCancel}
                type="button"
              >
                Cancel
              </button>
            )}
            <button
              className="publish-btn"
              onClick={handlePublish}
              disabled={publishing || !hasContent}
              type="button"
            >
              {publishing ? (
                <>
                  <Loader size={18} className="spinner" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send size={18} />
                  {isEditMode ? 'Update Entry' : 'Publish Entry'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={closeConfirmModal}
        confirmText={confirmModal.confirmText}
        cancelText="Cancel"
        type={confirmModal.type}
        confirmButtonStyle={confirmModal.confirmButtonStyle}
      />
    </div>
  );
};

export default EntryEditor;
