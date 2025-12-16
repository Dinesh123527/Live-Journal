import { ArrowLeft, Bell, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, FileText, Globe, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal.jsx';
import Navbar from '../../components/Navbar/Navbar.jsx';
import ScrollProgressBar from '../../components/ScrollProgressBar/ScrollProgressBar.jsx';
import axiosInstance from '../../utils/axiosInstance';
import { getHolidayForDate, getHolidaysForMonth } from '../../utils/holidays';
import './Calendar.scss';

const Calendar = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [username, setUsername] = useState('User');
  const [userEmail, setUserEmail] = useState('user@example.com');
  const [loading, setLoading] = useState(false);

  // Holiday settings
  const [selectedRegions, setSelectedRegions] = useState(['us', 'india']);
  const [showHolidaySettings, setShowHolidaySettings] = useState(false);

  // Confirm Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    onConfirm: () => { },
    type: 'danger'
  });

  // Form states
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start_datetime: '',
    end_datetime: '',
    all_day: false,
  });

  const [reminderForm, setReminderForm] = useState({
    title: '',
    remind_at: '',
    event_id: null,
    repeat_rule: 'none',
    channel: 'in_app',
  });

  useEffect(() => {
    fetchUserInfo();
    fetchMonthData();
  }, [currentDate]);

  useEffect(() => {
    if (selectedDate) {
      fetchDayEvents();
    }
  }, [selectedDate]);

  const fetchUserInfo = async () => {
    try {
      const response = await axiosInstance.get('/auth/me');
      if (response.data?.user?.name) {
        setUsername(response.data.user.name);
      }
      if (response.data?.user?.email) {
        setUserEmail(response.data.user.email);
      }
    } catch (err) {
      console.error('Failed to fetch user info:', err);
    }
  };

  const fetchMonthData = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const fromDate = formatDateForAPI(firstDay);
      const toDate = formatDateForAPI(lastDay);

      const [eventsResponse, remindersResponse] = await Promise.all([
        axiosInstance.get(`/events?from=${fromDate}&to=${toDate}`),
        axiosInstance.get('/reminders/upcoming?days=30'),
      ]);

      setEvents(eventsResponse.data?.events || []);
      setReminders(remindersResponse.data?.reminders || []);
    } catch (err) {
      console.error('Failed to fetch calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDayEvents = async () => {
    // Filter events for selected date
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    // This will be handled by the events state filtering
  };

  const formatDateForAPI = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateTimeForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days in month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const hasEventsOnDay = (day) => {
    if (!day) return false;
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = formatDateForAPI(date);

    return events.some(event => {
      const eventDate = event.start_datetime.split('T')[0];
      return eventDate === dateStr;
    });
  };

  const getEventsForSelectedDay = () => {
    const dateStr = formatDateForAPI(selectedDate);
    return events.filter(event => {
      const eventDate = event.start_datetime.split('T')[0];
      return eventDate === dateStr;
    });
  };

  const getUpcomingReminders = () => {
    const now = new Date();
    return reminders
      .filter(reminder => new Date(reminder.remind_at) >= now)
      .sort((a, b) => new Date(a.remind_at) - new Date(b.remind_at))
      .slice(0, 5);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDayClick = (day) => {
    if (day) {
      setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/events', eventForm);

      // Reset form first
      setEventForm({
        title: '',
        description: '',
        start_datetime: '',
        end_datetime: '',
        all_day: false,
      });

      // Close modal
      setShowEventModal(false);

      // Refresh data to show new event
      await fetchMonthData();

    } catch (err) {
      console.error('Failed to create event:', err);
      alert('Failed to create event. Please try again.');
    }
  };

  const handleCreateReminder = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/reminders', reminderForm);

      // Reset form first
      setReminderForm({
        title: '',
        remind_at: '',
        event_id: null,
        repeat_rule: 'none',
        channel: 'in_app',
      });

      // Close modal
      setShowReminderModal(false);

      // Refresh data to show new reminder
      await fetchMonthData();

    } catch (err) {
      console.error('Failed to create reminder:', err);
      alert('Failed to create reminder. Please try again.');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    // Find the event to get its title
    const event = events.find(e => e.id === eventId);
    const eventTitle = event?.title || 'this event';

    setConfirmConfig({
      title: 'Delete Event?',
      message: `Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await axiosInstance.delete(`/events/${eventId}`);
          setShowConfirmModal(false);
          fetchMonthData();
        } catch (err) {
          console.error('Failed to delete event:', err);
          alert('Failed to delete event. Please try again.');
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleDeleteReminder = async (reminderId) => {
    // Find the reminder to get its title
    const reminder = reminders.find(r => r.id === reminderId);
    const reminderTitle = reminder?.title || 'this reminder';

    setConfirmConfig({
      title: 'Delete Reminder?',
      message: `Are you sure you want to delete "${reminderTitle}"? This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await axiosInstance.delete(`/reminders/${reminderId}`);
          setShowConfirmModal(false);
          fetchMonthData();
        } catch (err) {
          console.error('Failed to delete reminder:', err);
          alert('Failed to delete reminder. Please try again.');
        }
      }
    });
    setShowConfirmModal(true);
  };

  const openEventModal = () => {
    const datetime = formatDateTimeForInput(selectedDate);
    setEventForm({
      ...eventForm,
      start_datetime: datetime,
      end_datetime: datetime,
    });
    setShowEventModal(true);
  };

  const openReminderModal = () => {
    const datetime = formatDateTimeForInput(selectedDate);
    setReminderForm({
      ...reminderForm,
      remind_at: datetime,
    });
    setShowReminderModal(true);
  };

  const formatTime = (datetime) => {
    const date = new Date(datetime);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatReminderDate = (datetime) => {
    const date = new Date(datetime);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return `Today at ${formatTime(datetime)}`;
    if (diffDays === 1) return `Tomorrow at ${formatTime(datetime)}`;
    if (diffDays < 7) return `${date.toLocaleDateString('en-US', { weekday: 'short' })} at ${formatTime(datetime)}`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` at ${formatTime(datetime)}`;
  };

  const getEmptyEventMessage = () => {
    const messages = [
      "✨ Your day is a blank canvas waiting for meaningful moments",
      "🌟 No events yet — perfect time to plan something extraordinary",
      "🎯 Start fresh! Schedule what matters most to you today",
      "💫 A clear schedule means endless possibilities await",
      "🚀 Ready to make this day legendary? Add your first event!",
      "🌈 Empty slate = opportunity to create memorable experiences",
      "⚡ No commitments yet — craft your perfect day from scratch"
    ];
    // Use date to get consistent message for the day
    const dayIndex = selectedDate.getDate() % messages.length;
    return messages[dayIndex];
  };

  const getDayGreeting = () => {
    const hour = new Date().getHours();
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    const isTomorrow = selectedDate.toDateString() === new Date(Date.now() + 86400000).toDateString();

    if (isTomorrow) return "Tomorrow's Agenda";
    if (!isToday) return "Day Overview";

    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    if (hour < 21) return "Good Evening";
    return "Tonight's Plans";
  };

  const getRemindersGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Morning Reminders";
    if (hour < 17) return "Afternoon Reminders";
    return "Evening Reminders";
  };

  const getEmptyReminderMessage = () => {
    const messages = [
      "🔔 Stay on top of things — set your first reminder",
      "💡 Never miss a beat! Add reminders for what matters",
      "⏰ Your personal assistant awaits — create a reminder",
      "🎯 Set it and forget it — let reminders keep you organized",
      "✨ Turn your intentions into actions with smart reminders",
      "🌟 Stay ahead of the game — schedule your reminders now",
      "🚀 Boost your productivity with timely reminders"
    ];
    const dayIndex = new Date().getDate() % messages.length;
    return messages[dayIndex];
  };

  const getReminderStatus = (remindAt) => {
    const now = new Date();
    const reminderDate = new Date(remindAt);
    const diffMs = reminderDate - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffMs < 0) return 'past';
    if (diffHours < 24) return 'active';
    if (diffDays < 7) return 'upcoming';
    return 'upcoming';
  };

  // Holiday helper functions
  const getHolidayForDay = (day) => {
    if (!day) return [];
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return getHolidayForDate(date, selectedRegions);
  };

  const getHolidaysForSelectedDay = () => {
    return getHolidayForDate(selectedDate, selectedRegions);
  };

  const toggleRegion = (region) => {
    setSelectedRegions(prev => {
      if (prev.includes(region)) {
        // Don't allow removing all regions
        if (prev.length === 1) return prev;
        return prev.filter(r => r !== region);
      }
      return [...prev, region];
    });
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const userProfileInfo = { name: username, email: userEmail };
  const dayEvents = getEventsForSelectedDay();
  const upcomingReminders = getUpcomingReminders();

  return (
    <div className="calendar-page">
      <Navbar isAuthenticated={true} userProfileInfo={userProfileInfo} />

      <ScrollProgressBar />

      <div className="calendar-content">
        <div className="calendar-header">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
          <h1>📅 Calendar & Events</h1>
        </div>

        <div className="calendar-layout">
          {/* Left Side - Calendar */}
          <div className="calendar-section">
            <div className="month-navigation">
              <button onClick={handlePrevMonth}>
                <ChevronLeft size={24} />
              </button>
              <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
              <button onClick={handleNextMonth}>
                <ChevronRight size={24} />
              </button>
            </div>

            {/* Holiday Settings */}
            <div className="holiday-settings">
              <button
                className="holiday-settings-btn"
                onClick={() => setShowHolidaySettings(!showHolidaySettings)}
              >
                <Globe size={18} />
                <span>Holidays</span>
                <span className="region-badges">
                  {selectedRegions.includes('us') && <span className="badge us">🇺🇸</span>}
                  {selectedRegions.includes('india') && <span className="badge india">🇮🇳</span>}
                </span>
              </button>

              {showHolidaySettings && (
                <div className="holiday-dropdown">
                  <div className="dropdown-header">
                    <h4>Select Holiday Regions</h4>
                  </div>
                  <div className="region-options">
                    <label className={`region-option ${selectedRegions.includes('us') ? 'active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={selectedRegions.includes('us')}
                        onChange={() => toggleRegion('us')}
                      />
                      <span className="region-flag">🇺🇸</span>
                      <span className="region-name">United States</span>
                      <span className="checkmark">{selectedRegions.includes('us') && '✓'}</span>
                    </label>
                    <label className={`region-option ${selectedRegions.includes('india') ? 'active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={selectedRegions.includes('india')}
                        onChange={() => toggleRegion('india')}
                      />
                      <span className="region-flag">🇮🇳</span>
                      <span className="region-name">India</span>
                      <span className="checkmark">{selectedRegions.includes('india') && '✓'}</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="calendar-grid">
              {dayNames.map(day => (
                <div key={day} className="day-name">{day}</div>
              ))}
              {getDaysInMonth().map((day, index) => {
                const holidays = getHolidayForDay(day);
                const hasHoliday = holidays.length > 0;
                return (
                  <div
                    key={index}
                    className={`calendar-day ${!day ? 'empty' : ''} ${day && day === selectedDate.getDate() &&
                      currentDate.getMonth() === selectedDate.getMonth() &&
                      currentDate.getFullYear() === selectedDate.getFullYear()
                      ? 'selected'
                      : ''
                      } ${day && hasEventsOnDay(day) ? 'has-events' : ''} ${hasHoliday ? 'has-holiday' : ''}`}
                    onClick={() => handleDayClick(day)}
                    title={hasHoliday ? holidays.map(h => `${h.emoji} ${h.name}`).join(', ') : ''}
                  >
                    {day && (
                      <>
                        <span className="day-number">{day}</span>
                        <div className="day-indicators">
                          {hasEventsOnDay(day) && <span className="event-dot"></span>}
                          {hasHoliday && <span className="holiday-dot"></span>}
                        </div>
                        {hasHoliday && (
                          <span className="holiday-emoji">{holidays[0].emoji}</span>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Monthly Holidays List */}
            {getHolidaysForMonth(currentDate.getFullYear(), currentDate.getMonth(), selectedRegions).length > 0 && (
              <div className="monthly-holidays">
                <h4>
                  <span>🎉</span>
                  Holidays this month
                </h4>
                <div className="holidays-list">
                  {getHolidaysForMonth(currentDate.getFullYear(), currentDate.getMonth(), selectedRegions).map((holiday, idx) => {
                    const regions = Array.isArray(holiday.type) ? holiday.type : [holiday.type];
                    const isCommon = regions.length > 1;
                    return (
                      <div
                        key={idx}
                        className={`holiday-item ${isCommon ? 'common' : regions[0]}`}
                        onClick={() => setSelectedDate(new Date(holiday.date))}
                      >
                        <span className="holiday-emoji">{holiday.emoji}</span>
                        <div className="holiday-info">
                          <span className="holiday-name">{holiday.name}</span>
                          <span className="holiday-date">
                            {holiday.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <span className="holiday-region">
                          {regions.includes('us') && <span className="flag">🇺🇸</span>}
                          {regions.includes('india') && <span className="flag">🇮🇳</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Events & Reminders */}
          <div className="details-section">
            {/* Selected Day Events */}
            <div className="day-events-card">
              <div className="card-header">
                <h3>
                  <CalendarIcon size={20} />
                  <span>{getDayGreeting()}</span>
                </h3>
                <button className="add-btn" onClick={openEventModal}>
                  <Plus size={18} />
                  {dayEvents.length === 0 ? 'Create Event' : 'Add More'}
                </button>
              </div>

              <div className="events-list">
                {dayEvents.length === 0 ? (
                  <div className="no-events">
                    <div className="date-info">
                      <p className="full-date">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                      <p className="year">{selectedDate.getFullYear()}</p>
                    </div>
                    <p className="empty-message">{getEmptyEventMessage()}</p>
                    <p className="empty-hint">Click "Create Event" to get started</p>
                  </div>
                ) : (
                  <>
                    <div className="events-count">
                      {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'} scheduled
                    </div>
                    {dayEvents.map(event => (
                      <div key={event.id} className="event-item">
                        <div className="event-info">
                          <h4>{event.title}</h4>
                          {event.description && <p>{event.description}</p>}
                          <span className="event-time">
                            <Clock size={14} />
                            {event.all_day ? '🌞 All Day Event' : formatTime(event.start_datetime)}
                            {!event.all_day && event.end_datetime && ` - ${formatTime(event.end_datetime)}`}
                          </span>
                        </div>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteEvent(event.id)}
                          title="Delete event"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Upcoming Reminders */}
            <div className="reminders-card">
              <div className="card-header">
                <h3>
                  <Bell size={20} />
                  <span>{getRemindersGreeting()}</span>
                </h3>
                <button className="add-btn" onClick={openReminderModal}>
                  <Plus size={18} />
                  {upcomingReminders.length === 0 ? 'Create Reminder' : 'Add More'}
                </button>
              </div>

              <div className="reminders-list">
                {upcomingReminders.length === 0 ? (
                  <div className="no-reminders">
                    <div className="date-info">
                      <p className="full-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                      <p className="year">{new Date().getFullYear()}</p>
                    </div>
                    <p className="empty-message">{getEmptyReminderMessage()}</p>
                    <p className="empty-hint">Click "Create Reminder" to stay organized</p>
                  </div>
                ) : (
                  <>
                    <div className="reminders-count">
                      {upcomingReminders.length} {upcomingReminders.length === 1 ? 'reminder' : 'reminders'} scheduled
                    </div>
                    {upcomingReminders.map(reminder => (
                      <div key={reminder.id} className="reminder-item">
                        <div className="reminder-icon">
                          {reminder.channel === 'email' && '📧'}
                          {reminder.channel === 'push' && '🔔'}
                          {reminder.channel === 'in_app' && '📱'}
                        </div>
                        <div className="reminder-info">
                          <h4>{reminder.title}</h4>
                          <div className="reminder-meta">
                            <span className="reminder-time">
                              <Clock size={14} />
                              {formatReminderDate(reminder.remind_at)}
                            </span>
                            {reminder.repeat_rule !== 'none' && (
                              <span className={`reminder-repeat ${reminder.repeat_rule}`}>
                                {reminder.repeat_rule === 'daily' && '🔁'}
                                {reminder.repeat_rule === 'weekly' && '📆'}
                                {reminder.repeat_rule === 'monthly' && '🗓️'}
                                {reminder.repeat_rule.charAt(0).toUpperCase() + reminder.repeat_rule.slice(1)}
                              </span>
                            )}
                            <span className={`reminder-channel ${reminder.channel}`}>
                              {reminder.channel === 'email' && (
                                <>
                                  <span>📧</span>
                                  <span>Email</span>
                                </>
                              )}
                              {reminder.channel === 'push' && (
                                <>
                                  <span>🔔</span>
                                  <span>Push</span>
                                </>
                              )}
                              {reminder.channel === 'in_app' && (
                                <>
                                  <span>📱</span>
                                  <span>In-App</span>
                                </>
                              )}
                            </span>
                            <span className={`reminder-status ${getReminderStatus(reminder.remind_at)}`}>
                              <span className="status-dot"></span>
                              {getReminderStatus(reminder.remind_at)}
                            </span>
                          </div>
                        </div>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteReminder(reminder.id)}
                          title="Delete reminder"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Event</h2>
              <button onClick={() => setShowEventModal(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateEvent}>
              <div className="form-group">
                <label>
                  <CalendarIcon size={16} />
                  Title *
                </label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  required
                  placeholder="Enter event title"
                />
              </div>
              <div className="form-group">
                <label>
                  <FileText size={16} />
                  Description
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Add event description (optional)"
                  rows="3"
                />
              </div>
              <div className="time-picker-group">
                <div className="time-picker-header">
                  <Clock size={18} />
                  <span>Event Timing</span>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Time *</label>
                    <input
                      type="datetime-local"
                      value={eventForm.start_datetime}
                      onChange={(e) => setEventForm({ ...eventForm, start_datetime: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>End Time</label>
                    <input
                      type="datetime-local"
                      value={eventForm.end_datetime}
                      onChange={(e) => setEventForm({ ...eventForm, end_datetime: e.target.value })}
                    />
                  </div>
                </div>
                <div className="all-day-toggle">
                  <input
                    type="checkbox"
                    id="all-day-event"
                    checked={eventForm.all_day}
                    onChange={(e) => setEventForm({ ...eventForm, all_day: e.target.checked })}
                  />
                  <label htmlFor="all-day-event" className="toggle-label">
                    <span className="toggle-switch">
                      <span className="toggle-slider"></span>
                    </span>
                    <span className="toggle-text">
                      <span className="icon">🌞</span>
                      <span className="text">All Day Event</span>
                    </span>
                  </label>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowEventModal(false)} className="event-cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={!eventForm.title.trim()}>
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="modal-overlay" onClick={() => setShowReminderModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Reminder</h2>
              <button onClick={() => setShowReminderModal(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateReminder}>
              <div className="form-group">
                <label>
                  <Bell size={16} />
                  Title *
                </label>
                <input
                  type="text"
                  value={reminderForm.title}
                  onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })}
                  required
                  placeholder="Enter reminder title"
                />
              </div>

              {/* Enhanced Time Picker */}
              <div className="time-picker-group reminder-time-picker">
                <div className="time-picker-header">
                  <Clock size={18} />
                  <span>Reminder Time</span>
                </div>
                <div className="form-group">
                  <label>Remind At *</label>
                  <input
                    type="datetime-local"
                    value={reminderForm.remind_at}
                    onChange={(e) => setReminderForm({ ...reminderForm, remind_at: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Custom Repeat Selector */}
              <div className="custom-selector-group">
                <label className="selector-label">
                  <span className="icon">🔁</span>
                  Repeat Pattern
                </label>
                <div className="repeat-options">
                  {['none', 'daily', 'weekly', 'monthly'].map((option) => (
                    <div
                      key={option}
                      className={`repeat-option ${reminderForm.repeat_rule === option ? 'active' : ''}`}
                      onClick={() => setReminderForm({ ...reminderForm, repeat_rule: option })}
                    >
                      <div className="option-icon">
                        {option === 'none' && '⏹️'}
                        {option === 'daily' && '📅'}
                        {option === 'weekly' && '📆'}
                        {option === 'monthly' && '🗓️'}
                      </div>
                      <div className="option-content">
                        <h4>{option.charAt(0).toUpperCase() + option.slice(1)}</h4>
                        <p>
                          {option === 'none' && 'One-time reminder'}
                          {option === 'daily' && 'Repeats every day'}
                          {option === 'weekly' && 'Repeats every week'}
                          {option === 'monthly' && 'Repeats every month'}
                        </p>
                      </div>
                      <div className="option-check">
                        {reminderForm.repeat_rule === option && '✓'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Channel Selector */}
              <div className="custom-selector-group">
                <label className="selector-label">
                  <span className="icon">📢</span>
                  Notification Channel
                </label>
                <div className="channel-options">
                  {[
                    { value: 'in_app', label: 'In App', icon: '📱', desc: 'Notification within the app' },
                    { value: 'email', label: 'Email', icon: '📧', desc: 'Send to your email address' },
                    { value: 'push', label: 'Push', icon: '🔔', desc: 'Browser push notification' }
                  ].map((channel) => (
                    <div
                      key={channel.value}
                      className={`channel-option ${reminderForm.channel === channel.value ? 'active' : ''}`}
                      onClick={() => setReminderForm({ ...reminderForm, channel: channel.value })}
                    >
                      <div className="channel-icon">{channel.icon}</div>
                      <div className="channel-content">
                        <h4>{channel.label}</h4>
                        <p>{channel.desc}</p>
                      </div>
                      <div className="channel-radio">
                        <div className={`radio-dot ${reminderForm.channel === channel.value ? 'active' : ''}`}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowReminderModal(false)} className="event-cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={!reminderForm.title.trim()}>
                  Create Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          message={confirmConfig.message}
          type={confirmConfig.type}
          confirmText="Delete"
          cancelText="Cancel"
          confirmButtonStyle="danger"
        />
      )}
    </div>
  );
};

export default Calendar;

