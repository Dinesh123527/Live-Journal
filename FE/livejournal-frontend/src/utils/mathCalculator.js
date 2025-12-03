export const evaluateExpression = (expression) => {
  try {
    // Remove whitespace
    const cleaned = expression.replace(/\s+/g, '');

    // Validate: only allow numbers, operators, parentheses, and decimal points
    if (!/^[\d+\-*/().]+$/.test(cleaned)) {
      return null;
    }

    // Check for dangerous patterns
    if (cleaned.includes('..') || /[+\-*/]{2,}/.test(cleaned)) {
      return null;
    }

    // Evaluate using Function constructor (safer than eval)
    const result = Function(`'use strict'; return (${cleaned})`)();

    // Validate result is a finite number
    if (typeof result === 'number' && isFinite(result)) {
      // Round to 10 decimal places to avoid floating point issues
      return Math.round(result * 10000000000) / 10000000000;
    }

    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Find math expressions in text and return positions
 * Looks for patterns like "12 * 6 =", "5+3=", "(10-2)*3="
 * @param {string} text - The text to search
 * @returns {Array} - Array of {expression, start, end, equals} objects
 */
export const findMathExpressions = (text) => {
  const expressions = [];

  // Pattern: numbers/operators followed by "="
  // Matches: "12*6=", "5 + 3 =", "(10-2)*3=", "100/5="
  const pattern = /([0-9+\-*/().\s]+)=(?!\s*\d)/g;

  let match;
  while ((match = pattern.exec(text)) !== null) {
    const expression = match[1].trim();
    const equalsPosition = match.index + match[1].length;

    // Must have at least one operator
    if (/[+\-*/]/.test(expression)) {
      expressions.push({
        expression,
        start: match.index,
        end: equalsPosition + 1, // Include the "="
        equalsPosition
      });
    }
  }

  return expressions;
};

export const replaceMathWithResult = (text, cursorPosition) => {
  const expressions = findMathExpressions(text);

  if (expressions.length === 0) {
    return { text, newCursorPosition: cursorPosition, calculated: false };
  }

  // Process from end to start to maintain positions
  let newText = text;
  let cursorAdjustment = 0;
  let calculated = false;

  for (let i = expressions.length - 1; i >= 0; i--) {
    const { expression, end } = expressions[i];
    const result = evaluateExpression(expression);

    if (result !== null) {
      // Check if there's already a result after the "="
      const afterEquals = newText.substring(end);

      // Check if the next character is a newline or space before a newline
      const nextChars = afterEquals.match(/^(\s*)/);
      const leadingWhitespace = nextChars ? nextChars[1] : '';
      const afterWhitespace = afterEquals.substring(leadingWhitespace.length);

      // Check if there's already a number result (not on a new line)
      const hasResult = /^-?\d+\.?\d*/.test(afterWhitespace) && !leadingWhitespace.includes('\n');

      if (!hasResult) {
        // Preserve line breaks - if there's a newline in the whitespace, keep the structure
        const resultText = leadingWhitespace.includes('\n')
          ? ` ${result}${leadingWhitespace}`
          : ` ${result}`;

        newText = newText.substring(0, end) + resultText + newText.substring(end + leadingWhitespace.length);

        // Adjust cursor position if it's after the insertion point
        if (cursorPosition >= end) {
          cursorAdjustment += (resultText.length - leadingWhitespace.length);
        }

        calculated = true;
      }
    }
  }

  return {
    text: newText,
    newCursorPosition: cursorPosition + cursorAdjustment,
    calculated
  };
};

export const hasMathExpressionAtCursor = (text, cursorPosition) => {
  // Get the current line
  const beforeCursor = text.substring(0, cursorPosition);
  const lastNewline = beforeCursor.lastIndexOf('\n');
  const currentLine = text.substring(lastNewline + 1, cursorPosition);

  // Check if line ends with "=" and contains math operators
  return /[0-9+\-*/().\s]+=$/.test(currentLine) && /[+\-*/]/.test(currentLine);
};

/**
 * Format number for display (remove unnecessary decimals)
 * @param {number} num - Number to format
 * @returns {string}
 */
export const formatNumber = (num) => {
  if (Number.isInteger(num)) {
    return num.toString();
  }

  // Remove trailing zeros
  return parseFloat(num.toFixed(10)).toString();
};

export const isValidMathExpression = (str) => {
  const cleaned = str.replace(/\s+/g, '');

  // Must contain at least one operator
  if (!/[+\-*/]/.test(cleaned)) {
    return false;
  }

  if (!/^[\d+\-*/().]+$/.test(cleaned)) {
    return false;
  }

  return evaluateExpression(str) !== null;
};

export default {
  evaluateExpression,
  findMathExpressions,
  replaceMathWithResult,
  hasMathExpressionAtCursor,
  formatNumber,
  isValidMathExpression
};
