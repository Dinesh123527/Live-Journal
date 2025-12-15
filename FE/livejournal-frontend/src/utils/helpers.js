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


export const stripHtmlTags = (html) => {
  if (!html || typeof html !== 'string') return '';

  // Create a temporary div element to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Get text content (this automatically strips all HTML tags and decodes entities)
  const text = tempDiv.textContent || tempDiv.innerText || '';

  // Clean up extra whitespace and newlines
  return text.replace(/\s+/g, ' ').trim();
};

/**
 * Truncate HTML content by extracting text first, then truncating
 * @param {string} html - HTML string
 * @param {number} maxLength - Maximum length of text
 * @returns {string} Truncated plain text
 */
export const truncateHtmlContent = (html, maxLength) => {
  if (!html) return '';

  const plainText = stripHtmlTags(html);

  if (plainText.length <= maxLength) return plainText;

  return plainText.substring(0, maxLength) + '...';
};


export const getHtmlPreview = (html, maxLength = 200) => {
  return truncateHtmlContent(html, maxLength);
};
