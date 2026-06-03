// src/utils/validation.ts

export interface ValidationResult {
  isValid: boolean;
  errorMessage: string | null;
}

/**
 * Check if string contains ANY emojis
 */
export const containsEmoji = (text: string): boolean => {
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{231A}\u{231B}\u{2328}\u{23CF}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{24C2}\u{25AA}\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2600}-\u{2604}\u{260E}\u{2611}\u{2614}\u{2615}\u{2618}\u{261D}\u{2620}\u{2622}\u{2623}\u{2626}\u{262A}\u{262E}\u{262F}\u{2638}-\u{263A}\u{2648}-\u{2653}\u{2660}\u{2663}\u{2665}\u{2666}\u{2668}\u{267B}\u{267E}\u{267F}\u{2692}-\u{2697}\u{2699}\u{269B}\u{269C}\u{26A0}\u{26A1}\u{26A7}\u{26AA}\u{26AB}\u{26B0}\u{26B1}\u{26BD}\u{26BE}\u{26C4}\u{26C5}\u{26C8}\u{26CE}\u{26CF}\u{26D1}\u{26D3}\u{26D4}\u{26E9}\u{26EA}\u{26F0}-\u{26F5}\u{26F7}-\u{26FA}\u{26FD}\u{2702}\u{2705}\u{2708}-\u{270D}\u{270F}\u{2712}\u{2714}\u{2716}\u{271D}\u{2721}\u{2728}\u{2733}\u{2734}\u{2744}\u{2747}\u{274C}\u{274E}\u{2753}-\u{2755}\u{2757}\u{2763}\u{2764}\u{2795}-\u{2797}\u{27A1}\u{27B0}\u{27BF}\u{2934}\u{2935}\u{2B05}-\u{2B07}\u{2B1B}\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}]/u;
  return emojiRegex.test(text);
};

/**
 * Check if string contains special characters (only allows letters, numbers, spaces, and basic punctuation)
 * Allowed: a-z A-Z 0-9 space - ' . 
 */
export const containsInvalidSpecialChars = (text: string): boolean => {
  // Allow: letters (a-z A-Z), numbers (0-9), spaces, hyphens, apostrophes, periods
  const validRegex = /^[a-zA-Z0-9\s\-'.]+$/;
  return !validRegex.test(text);
};

/**
 * Get list of invalid special characters found (excluding emojis)
 */
export const getInvalidSpecialChars = (text: string): string[] => {
  const invalidChars: string[] = [];
  const validRegex = /[a-zA-Z0-9\s\-'.]/;
  
  for (const char of text) {
    if (!validRegex.test(char) && !invalidChars.includes(char)) {
      // Skip if it's an emoji (will be caught separately)
      if (!containsEmoji(char)) {
        invalidChars.push(char);
      }
    }
  }
  return invalidChars;
};

/**
 * Get first invalid emoji found
 */
export const getFirstEmoji = (text: string): string | null => {
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2764}\u{2B50}\u{2B55}]/u;
  const match = text.match(emojiRegex);
  return match ? match[0] : null;
};

/**
 * Get emoji display name for error message
 */
const getEmojiDisplayName = (emoji: string): string => {
  const emojiNames: Record<string, string> = {
    '❤️': 'heart',
    '😊': 'smiley',
    '😂': 'laughing face',
    '😢': 'crying face',
    '🥺': 'pleading face',
    '😍': 'heart eyes',
    '👍': 'thumbs up',
    '🔥': 'fire',
    '✨': 'sparkles',
    '⭐': 'star',
    '🌟': 'glowing star',
    '💯': 'hundred points',
    '💔': 'broken heart',
    '💙': 'blue heart',
    '💚': 'green heart',
    '💛': 'yellow heart',
    '💜': 'purple heart',
    '🖤': 'black heart',
    '🤍': 'white heart',
    '🤎': 'brown heart',
  };
  return emojiNames[emoji] || 'emoji';
};

/**
 * Validate child nickname before profile creation.
 * Allows simple readable names and blocks emojis or unsupported symbols.
 */
export const validateNickname = (nickname: string): ValidationResult => {
  const trimmed = nickname.trim();
  
  // Check if empty
  if (trimmed.length === 0) {
    return {
      isValid: false,
      errorMessage: "Please enter a nickname"
    };
  }
  
  // Check minimum length
  if (trimmed.length < 2) {
    return {
      isValid: false,
      errorMessage: "Nickname must be at least 2 characters"
    };
  }
  
  // Check maximum length
  if (trimmed.length > 20) {
    return {
      isValid: false,
      errorMessage: "Nickname must be less than 20 characters"
    };
  }
  
  // 🔥 CHECK FOR EMOJIS - NOT ALLOWED AT ALL
  if (containsEmoji(trimmed)) {
    const firstEmoji = getFirstEmoji(trimmed);
    const emojiName = firstEmoji ? getEmojiDisplayName(firstEmoji) : 'emoji';
    return {
      isValid: false,
      errorMessage: `Please remove ${emojiName} ${firstEmoji} from your nickname`
    };
  }
  
  // Check for special characters (allow only letters, numbers, spaces, hyphens, apostrophes, periods)
  if (containsInvalidSpecialChars(trimmed)) {
    const invalidChars = getInvalidSpecialChars(trimmed);
    if (invalidChars.length > 0) {
      const displayChars = invalidChars.slice(0, 3).map(c => `"${c}"`).join(', ');
      return {
        isValid: false,
        errorMessage: `Remove ${displayChars}${invalidChars.length > 3 ? '...' : ''} (use only letters, numbers, spaces, -, ', .)`
      };
    }
  }
  
  // Check for consecutive spaces
  if (trimmed.includes('  ')) {
    return {
      isValid: false,
      errorMessage: "Don't use multiple spaces in a row"
    };
  }
  
  // Check if starts or ends with space
  if (trimmed.startsWith(' ') || trimmed.endsWith(' ')) {
    return {
      isValid: false,
      errorMessage: "Nickname can't start or end with a space"
    };
  }
  
  // Check for inappropriate words (basic filter)
  const inappropriateWords = ['badword1', 'badword2', 'stupid', 'dumb', 'idiot']; // Add more as needed
  const lowerNickname = trimmed.toLowerCase();
  for (const word of inappropriateWords) {
    if (lowerNickname.includes(word)) {
      return {
        isValid: false,
        errorMessage: "Please choose a different nickname"
      };
    }
  }
  
  // All validations passed
  return {
    isValid: true,
    errorMessage: null
  };
};

/**
 * Sanitize nickname (clean up before saving)
 */
export const sanitizeNickname = (nickname: string): string => {
  return nickname
    .trim()                           
    .replace(/\s+/g, ' ')             
    .replace(/[^\w\s\-'.]/g, '')      
    .substring(0, 20);                
};

/**
 * Get validation hint message (for display under input)
 */
export const getNicknameHint = (): string => {
  return "Use 2-20 letters, numbers, spaces, -, ' or . (no emojis)";
};