export const formatName = (fullName, maxLength = 20) => {
  if (!fullName || typeof fullName !== 'string') {
    return 'User';
  }

  const trimmedName = fullName.trim();

  if (trimmedName.length <= maxLength) {
    return trimmedName;
  }


  const nameParts = trimmedName.split(/\s+/);

  if (nameParts.length === 1) {
    return trimmedName.substring(0, maxLength - 3) + '...';
  }

  if (nameParts.length === 2) {
    const formatted = `${nameParts[0]} ${nameParts[1]}`;
    if (formatted.length <= maxLength) {
      return formatted;
    }
    return `${nameParts[0]} ${nameParts[1].charAt(0)}.`;
  }

  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];
  const middleNames = nameParts.slice(1, -1);

  let formatted = `${firstName} ${lastName}`;
  if (formatted.length <= maxLength) {
    return formatted;
  }

  const middleInitials = middleNames.map(name => name.charAt(0).toUpperCase() + '.').join(' ');
  formatted = `${firstName} ${middleInitials} ${lastName}`;
  if (formatted.length <= maxLength) {
    return formatted;
  }

  formatted = `${firstName} ${lastName.charAt(0)}.`;
  if (formatted.length <= maxLength) {
    return formatted;
  }

  return `${firstName.substring(0, maxLength - 5)}... ${lastName.charAt(0)}.`;
};

export const getInitials = (name) => {
  if (!name || typeof name !== 'string') {
    return 'U';
  }

  const nameParts = name.trim().split(/\s+/);

  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase();
  }

  return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
};

export const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};

export const formatDate = (date) => {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const options = { year: 'numeric', month: 'long', day: 'numeric' };

  return dateObj.toLocaleDateString('en-US', options);
};

export const truncateText = (text, maxLength = 100) => {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;

  return text.substring(0, maxLength - 3) + '...';
};

