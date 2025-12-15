const getEasterDate = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
};

const getNthDayOfMonth = (year, month, dayOfWeek, n) => {
  // Get the nth occurrence of a day of week in a month
  // n can be negative (-1 means last occurrence)
  const lastDay = new Date(year, month + 1, 0);

  if (n > 0) {
    let count = 0;
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === dayOfWeek) {
        count++;
        if (count === n) return date;
      }
    }
  } else {
    // Last occurrence
    for (let day = lastDay.getDate(); day >= 1; day--) {
      const date = new Date(year, month, day);
      if (date.getDay() === dayOfWeek) return date;
    }
  }
  return null;
};

// US Federal Holidays
const getUSHolidays = (year) => {
  const holidays = [];

  // New Year's Day - January 1
  holidays.push({
    date: new Date(year, 0, 1),
    name: "New Year's Day",
    type: 'us',
    emoji: '🎆'
  });

  // Martin Luther King Jr. Day - 3rd Monday of January
  holidays.push({
    date: getNthDayOfMonth(year, 0, 1, 3),
    name: "Martin Luther King Jr. Day",
    type: 'us',
    emoji: '✊'
  });

  // Presidents' Day - 3rd Monday of February
  holidays.push({
    date: getNthDayOfMonth(year, 1, 1, 3),
    name: "Presidents' Day",
    type: 'us',
    emoji: '🇺🇸'
  });

  // Memorial Day - Last Monday of May
  holidays.push({
    date: getNthDayOfMonth(year, 4, 1, -1),
    name: "Memorial Day",
    type: 'us',
    emoji: '🎖️'
  });

  // Juneteenth - June 19
  holidays.push({
    date: new Date(year, 5, 19),
    name: "Juneteenth",
    type: 'us',
    emoji: '✊🏿'
  });

  // Independence Day - July 4
  holidays.push({
    date: new Date(year, 6, 4),
    name: "Independence Day",
    type: 'us',
    emoji: '🎇'
  });

  // Labor Day - 1st Monday of September
  holidays.push({
    date: getNthDayOfMonth(year, 8, 1, 1),
    name: "Labor Day",
    type: 'us',
    emoji: '👷'
  });

  // Columbus Day - 2nd Monday of October
  holidays.push({
    date: getNthDayOfMonth(year, 9, 1, 2),
    name: "Columbus Day",
    type: 'us',
    emoji: '🧭'
  });

  // Veterans Day - November 11
  holidays.push({
    date: new Date(year, 10, 11),
    name: "Veterans Day",
    type: 'us',
    emoji: '🎖️'
  });

  // Thanksgiving - 4th Thursday of November
  holidays.push({
    date: getNthDayOfMonth(year, 10, 4, 4),
    name: "Thanksgiving",
    type: 'us',
    emoji: '🦃'
  });

  // Christmas Day - December 25
  holidays.push({
    date: new Date(year, 11, 25),
    name: "Christmas Day",
    type: 'us',
    emoji: '🎄'
  });

  // Easter Sunday (not federal but widely celebrated)
  holidays.push({
    date: getEasterDate(year),
    name: "Easter Sunday",
    type: 'us',
    emoji: '🐰'
  });

  // Valentine's Day - February 14
  holidays.push({
    date: new Date(year, 1, 14),
    name: "Valentine's Day",
    type: 'us',
    emoji: '💕'
  });

  // Halloween - October 31
  holidays.push({
    date: new Date(year, 9, 31),
    name: "Halloween",
    type: 'us',
    emoji: '🎃'
  });

  return holidays;
};

// Indian Holidays (Fixed dates - some festivals vary by lunar calendar)
const getIndianHolidays = (year) => {
  const holidays = [];

  // Republic Day - January 26
  holidays.push({
    date: new Date(year, 0, 26),
    name: "Republic Day",
    type: 'india',
    emoji: '🇮🇳'
  });

  // Holi (approximate - typically in March)
  holidays.push({
    date: new Date(year, 2, 14),
    name: "Holi",
    type: 'india',
    emoji: '🎨'
  });

  // Good Friday (Friday before Easter)
  const easter = getEasterDate(year);
  holidays.push({
    date: new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000),
    name: "Good Friday",
    type: 'india',
    emoji: '✝️'
  });

  // Ambedkar Jayanti - April 14
  holidays.push({
    date: new Date(year, 3, 14),
    name: "Ambedkar Jayanti",
    type: 'india',
    emoji: '📘'
  });

  // Independence Day - August 15
  holidays.push({
    date: new Date(year, 7, 15),
    name: "Independence Day",
    type: 'india',
    emoji: '🇮🇳'
  });

  // Janmashtami (approximate - typically in August/September)
  holidays.push({
    date: new Date(year, 7, 26),
    name: "Janmashtami",
    type: 'india',
    emoji: '🙏'
  });

  // Gandhi Jayanti - October 2
  holidays.push({
    date: new Date(year, 9, 2),
    name: "Gandhi Jayanti",
    type: 'india',
    emoji: '🕊️'
  });

  // Dussehra (approximate - typically in October)
  holidays.push({
    date: new Date(year, 9, 12),
    name: "Dussehra",
    type: 'india',
    emoji: '🏹'
  });

  // Diwali (approximate - typically in October/November)
  holidays.push({
    date: new Date(year, 10, 1),
    name: "Diwali",
    type: 'india',
    emoji: '🪔'
  });

  // Guru Nanak Jayanti (approximate)
  holidays.push({
    date: new Date(year, 10, 15),
    name: "Guru Nanak Jayanti",
    type: 'india',
    emoji: '🙏'
  });

  // Christmas Day - December 25
  holidays.push({
    date: new Date(year, 11, 25),
    name: "Christmas Day",
    type: 'india',
    emoji: '🎄'
  });

  // Eid ul-Fitr (approximate - moves based on Islamic calendar)
  holidays.push({
    date: new Date(year, 3, 10),
    name: "Eid ul-Fitr",
    type: 'india',
    emoji: '🌙'
  });

  // Eid ul-Adha (approximate - moves based on Islamic calendar)
  holidays.push({
    date: new Date(year, 5, 17),
    name: "Eid ul-Adha",
    type: 'india',
    emoji: '🕌'
  });

  // Raksha Bandhan (approximate)
  holidays.push({
    date: new Date(year, 7, 19),
    name: "Raksha Bandhan",
    type: 'india',
    emoji: '🎀'
  });

  // Ganesh Chaturthi (approximate)
  holidays.push({
    date: new Date(year, 8, 7),
    name: "Ganesh Chaturthi",
    type: 'india',
    emoji: '🐘'
  });

  // Pongal - January 14
  holidays.push({
    date: new Date(year, 0, 14),
    name: "Pongal / Makar Sankranti",
    type: 'india',
    emoji: '🌾'
  });

  return holidays;
};

// Get all holidays for a given year and selected regions
export const getHolidays = (year, regions = ['us', 'india']) => {
  let holidays = [];

  if (regions.includes('us')) {
    holidays = [...holidays, ...getUSHolidays(year)];
  }

  if (regions.includes('india')) {
    holidays = [...holidays, ...getIndianHolidays(year)];
  }

  // Merge holidays that fall on the same date with similar names
  const mergedHolidays = [];
  const dateMap = new Map();

  holidays.forEach(holiday => {
    const dateKey = `${holiday.date.getFullYear()}-${holiday.date.getMonth()}-${holiday.date.getDate()}`;

    if (dateMap.has(dateKey)) {
      const existing = dateMap.get(dateKey);
      // Check if it's the same or similar holiday (same name or same date for major holidays)
      const isSameHoliday = existing.name.toLowerCase() === holiday.name.toLowerCase() ||
        (existing.name.includes('Christmas') && holiday.name.includes('Christmas')) ||
        (existing.name.includes('Good Friday') && holiday.name.includes('Good Friday')) ||
        (existing.name.includes('Easter') && holiday.name.includes('Easter'));

      if (isSameHoliday) {
        // Merge the types into an array
        if (!Array.isArray(existing.type)) {
          existing.type = [existing.type];
        }
        if (!existing.type.includes(holiday.type)) {
          existing.type.push(holiday.type);
        }
      } else {
        // Different holiday on same date, add separately
        mergedHolidays.push(holiday);
      }
    } else {
      dateMap.set(dateKey, holiday);
      mergedHolidays.push(holiday);
    }
  });

  // Sort by date
  mergedHolidays.sort((a, b) => a.date - b.date);

  return mergedHolidays;
};

// Helper to check if holiday is for a specific region
export const isHolidayForRegion = (holiday, region) => {
  if (Array.isArray(holiday.type)) {
    return holiday.type.includes(region);
  }
  return holiday.type === region;
};

// Helper to get all regions for a holiday
export const getHolidayRegions = (holiday) => {
  if (Array.isArray(holiday.type)) {
    return holiday.type;
  }
  return [holiday.type];
};

// Get holidays for a specific month
export const getHolidaysForMonth = (year, month, regions = ['us', 'india']) => {
  const allHolidays = getHolidays(year, regions);
  return allHolidays.filter(holiday =>
    holiday.date.getMonth() === month && holiday.date.getFullYear() === year
  );
};

// Check if a specific date is a holiday
export const getHolidayForDate = (date, regions = ['us', 'india']) => {
  const year = date.getFullYear();
  const holidays = getHolidays(year, regions);

  return holidays.filter(holiday =>
    holiday.date.getDate() === date.getDate() &&
    holiday.date.getMonth() === date.getMonth() &&
    holiday.date.getFullYear() === date.getFullYear()
  );
};

// Format date to string key
export const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default {
  getHolidays,
  getHolidaysForMonth,
  getHolidayForDate,
  formatDateKey,
  isHolidayForRegion,
  getHolidayRegions
};
