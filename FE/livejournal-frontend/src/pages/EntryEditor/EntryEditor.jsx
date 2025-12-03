import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Send, X, Loader, ArrowLeft, Lock, Globe, Bold, Italic, List, ListOrdered, Cloud, CloudOff, Plus, Tag } from 'lucide-react';
import Navbar from '../../components/Navbar/Navbar.jsx';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal.jsx';
import axiosInstance from '../../utils/axiosInstance';
import { replaceMathWithResult } from '../../utils/mathCalculator';
import './EntryEditor.scss';

const EntryEditor = () => {
  const navigate = useNavigate();
  const { draftId, id: entryId } = useParams();
  const isEditMode = !!entryId;
  const isDraftMode = !!draftId;

  // Form states
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);

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
      openConfirmModal('cancel', () => navigate('/dashboard'));
    } else {
      navigate('/dashboard');
    }
  };

  // Handle back navigation with confirmation if there's content
  const handleBack = () => {
    if (hasContent) {
      openConfirmModal('cancel', () => navigate('/dashboard'));
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
          </div>

          <div className="form-group tags-group">
            <div className="tags-header">
              <label htmlFor="tags">
                <Tag size={18} />
                Tags
              </label>
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
            </div>
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
                 `${10 - tags.length} more tag${10 - tags.length === 1 ? '' : 's'} available`}
              </p>
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
