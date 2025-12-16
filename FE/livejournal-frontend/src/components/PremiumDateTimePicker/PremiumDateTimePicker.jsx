import { ChevronDown, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import './PremiumDateTimePicker.scss';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PremiumDateTimePicker = ({
    selectedDate,
    selectedTime = '09:00',
    onDateChange,
    onTimeChange,
    minDate = new Date()
}) => {
    const [currentMonth, setCurrentMonth] = useState(() => {
        const date = selectedDate ? new Date(selectedDate) : new Date();
        return new Date(date.getFullYear(), date.getMonth(), 1);
    });
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [showYearPicker, setShowYearPicker] = useState(false);
    const [animating, setAnimating] = useState(false);
    const [slideDirection, setSlideDirection] = useState('');
    const timePickerRef = useRef(null);
    const monthPickerRef = useRef(null);
    const yearPickerRef = useRef(null);
    const [selectedDecade, setSelectedDecade] = useState(() => {
        const year = currentMonth.getFullYear();
        return Math.floor(year / 10) * 10;
    });

    // Generate decades (1950-2100)
    const decades = useMemo(() => {
        const decadeList = [];
        for (let d = 1950; d <= 2100; d += 10) {
            decadeList.push(d);
        }
        return decadeList;
    }, []);

    // Generate years for selected decade
    const yearsInDecade = useMemo(() => {
        return Array.from({ length: 10 }, (_, i) => selectedDecade + i);
    }, [selectedDecade]);

    // Parse time
    const [hour, minute] = useMemo(() => {
        const [h, m] = (selectedTime || '09:00').split(':');
        return [parseInt(h, 10), parseInt(m, 10)];
    }, [selectedTime]);

    // Get calendar days
    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const days = [];

        // Previous month days
        for (let i = firstDay - 1; i >= 0; i--) {
            days.push({
                day: daysInPrevMonth - i,
                isCurrentMonth: false,
                date: new Date(year, month - 1, daysInPrevMonth - i)
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                day: i,
                isCurrentMonth: true,
                date: new Date(year, month, i)
            });
        }

        // Next month days
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push({
                day: i,
                isCurrentMonth: false,
                date: new Date(year, month + 1, i)
            });
        }

        return days;
    }, [currentMonth]);

    const goToPrevMonth = () => {
        setSlideDirection('slide-right');
        setAnimating(true);
        setTimeout(() => {
            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
            setAnimating(false);
        }, 200);
    };

    const goToNextMonth = () => {
        setSlideDirection('slide-left');
        setAnimating(true);
        setTimeout(() => {
            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
            setAnimating(false);
        }, 200);
    };

    const handleMonthSelect = (monthIndex) => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), monthIndex, 1));
        setShowMonthPicker(false);
    };

    const handleYearSelect = (year) => {
        setCurrentMonth(new Date(year, currentMonth.getMonth(), 1));
        setShowYearPicker(false);
    };

    // Check if date is selectable
    const isDateSelectable = (date) => {
        const min = new Date(minDate);
        min.setHours(0, 0, 0, 0);
        return date >= min;
    };

    // Check if date is selected
    const isDateSelected = (date) => {
        if (!selectedDate) return false;
        const selected = new Date(selectedDate);
        return (
            date.getDate() === selected.getDate() &&
            date.getMonth() === selected.getMonth() &&
            date.getFullYear() === selected.getFullYear()
        );
    };

    // Check if date is today
    const isToday = (date) => {
        const today = new Date();
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    };

    // Handle date click
    const handleDateClick = (dayInfo) => {
        if (!isDateSelectable(dayInfo.date)) return;
        // Use local date format to avoid timezone issues
        const year = dayInfo.date.getFullYear();
        const month = String(dayInfo.date.getMonth() + 1).padStart(2, '0');
        const day = String(dayInfo.date.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        onDateChange(dateString);
    };

    // Handle time change
    const handleHourChange = (newHour) => {
        const formattedTime = `${String(newHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        onTimeChange(formattedTime);
    };

    const handleMinuteChange = (newMinute) => {
        const formattedTime = `${String(hour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`;
        onTimeChange(formattedTime);
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (timePickerRef.current && !timePickerRef.current.contains(e.target)) {
                setShowTimePicker(false);
            }
            if (monthPickerRef.current && !monthPickerRef.current.contains(e.target)) {
                setShowMonthPicker(false);
            }
            if (yearPickerRef.current && !yearPickerRef.current.contains(e.target)) {
                setShowYearPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Format display time
    const formatDisplayTime = () => {
        const h = hour % 12 || 12;
        const ampm = hour >= 12 ? 'PM' : 'AM';
        return `${h}:${String(minute).padStart(2, '0')} ${ampm}`;
    };

    return (
        <div className="premium-datetime-picker">
            {/* Calendar Section */}
            <div className="calendar-section">
                <div className="calendar-header">
                    <button
                        className="nav-btn"
                        onClick={goToPrevMonth}
                        aria-label="Previous month"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div className="month-year-selectors">
                        {/* Month Selector */}
                        <div className="selector-wrapper" ref={monthPickerRef}>
                            <button
                                className="selector-btn"
                                onClick={() => {
                                    setShowMonthPicker(!showMonthPicker);
                                    setShowYearPicker(false);
                                }}
                            >
                                <span>{MONTHS[currentMonth.getMonth()]}</span>
                                <ChevronDown size={14} />
                            </button>
                            {showMonthPicker && (
                                <div className="selector-dropdown month-dropdown">
                                    {MONTHS.map((month, index) => (
                                        <button
                                            key={month}
                                            className={`selector-item ${index === currentMonth.getMonth() ? 'active' : ''}`}
                                            onClick={() => handleMonthSelect(index)}
                                        >
                                            {month}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Year Selector */}
                        <div className="selector-wrapper" ref={yearPickerRef}>
                            <button
                                className="selector-btn year-btn"
                                onClick={() => {
                                    setShowYearPicker(!showYearPicker);
                                    setShowMonthPicker(false);
                                    // Set decade to current year's decade when opening
                                    setSelectedDecade(Math.floor(currentMonth.getFullYear() / 10) * 10);
                                }}
                            >
                                <span>{currentMonth.getFullYear()}</span>
                                <ChevronDown size={14} />
                            </button>
                            {showYearPicker && (
                                <div className="selector-dropdown year-dropdown">
                                    {/* Decade Selector */}
                                    <div className="decade-header">
                                        <button
                                            className="decade-nav"
                                            onClick={() => setSelectedDecade(Math.max(1950, selectedDecade - 10))}
                                            disabled={selectedDecade <= 1950}
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <span className="decade-label">{selectedDecade} - {selectedDecade + 9}</span>
                                        <button
                                            className="decade-nav"
                                            onClick={() => setSelectedDecade(Math.min(2100, selectedDecade + 10))}
                                            disabled={selectedDecade >= 2100}
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>

                                    {/* Years Grid */}
                                    <div className="years-grid">
                                        {yearsInDecade.map(year => (
                                            <button
                                                key={year}
                                                className={`selector-item ${year === currentMonth.getFullYear() ? 'active' : ''}`}
                                                onClick={() => handleYearSelect(year)}
                                            >
                                                {year}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Quick decade jumps */}
                                    <div className="decade-shortcuts">
                                        <button onClick={() => setSelectedDecade(2020)}>2020s</button>
                                        <button onClick={() => setSelectedDecade(2030)}>2030s</button>
                                        <button onClick={() => setSelectedDecade(2050)}>2050s</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        className="nav-btn"
                        onClick={goToNextMonth}
                        aria-label="Next month"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className="weekdays">
                    {DAYS.map(day => (
                        <div key={day} className="weekday">{day}</div>
                    ))}
                </div>

                <div className={`calendar-grid ${animating ? slideDirection : ''}`}>
                    {calendarDays.map((dayInfo, index) => {
                        const selectable = isDateSelectable(dayInfo.date);
                        const selected = isDateSelected(dayInfo.date);
                        const today = isToday(dayInfo.date);

                        return (
                            <button
                                key={index}
                                className={`day-cell 
                                    ${!dayInfo.isCurrentMonth ? 'other-month' : ''} 
                                    ${!selectable ? 'disabled' : ''} 
                                    ${selected ? 'selected' : ''} 
                                    ${today ? 'today' : ''}
                                `}
                                onClick={() => handleDateClick(dayInfo)}
                                disabled={!selectable}
                            >
                                <span className="day-number">{dayInfo.day}</span>
                                {selected && <span className="selection-ring"></span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Time Section */}
            <div className="time-section" ref={timePickerRef}>
                <button
                    className="time-display"
                    onClick={() => setShowTimePicker(!showTimePicker)}
                >
                    <Clock size={18} />
                    <span>{formatDisplayTime()}</span>
                </button>

                {showTimePicker && (
                    <div className="time-picker-dropdown">
                        <div className="time-picker-header">
                            <Clock size={16} />
                            <span>Select Time</span>
                        </div>

                        <div className="time-wheels">
                            {/* Hour Wheel */}
                            <div className="wheel-container">
                                <label>Hour</label>
                                <div className="wheel">
                                    {Array.from({ length: 24 }, (_, i) => (
                                        <button
                                            key={i}
                                            className={`wheel-item ${hour === i ? 'active' : ''}`}
                                            onClick={() => handleHourChange(i)}
                                        >
                                            {String(i).padStart(2, '0')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="time-separator">:</div>

                            {/* Minute Wheel */}
                            <div className="wheel-container">
                                <label>Minute</label>
                                <div className="wheel">
                                    {Array.from({ length: 12 }, (_, i) => i * 5).map(m => (
                                        <button
                                            key={m}
                                            className={`wheel-item ${minute === m ? 'active' : ''}`}
                                            onClick={() => handleMinuteChange(m)}
                                        >
                                            {String(m).padStart(2, '0')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button
                            className="time-confirm-btn"
                            onClick={() => setShowTimePicker(false)}
                        >
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PremiumDateTimePicker;
