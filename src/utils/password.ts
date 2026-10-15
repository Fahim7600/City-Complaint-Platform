import crypto from "node:crypto";

// Exclude ambiguous characters: 0, O, 1, l, I
const UPPERCASE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // without I, O
const LOWERCASE_CHARS = "abcdefghijkmnopqrstuvwxyz"; // without l
const DIGIT_CHARS = "23456789"; // without 0, 1
const SYMBOL_CHARS = "!@#$%&*";

const ALL_CHARS =
  UPPERCASE_CHARS + LOWERCASE_CHARS + DIGIT_CHARS + SYMBOL_CHARS;

/**
 * Generates a 12-character secure temporary password using crypto.randomInt.
 * Guaranteed to contain at least 1 uppercase, 1 lowercase, 1 digit and 1 symbol.
 * Excludes ambiguous characters (0/O, 1/l/I) and satisfies all password validation rules.
 */
export const generateTempPassword = (): string => {
  const chars: string[] = [];

  // Guarantee at least one character from each required category
  chars.push(UPPERCASE_CHARS[crypto.randomInt(0, UPPERCASE_CHARS.length)]);
  chars.push(LOWERCASE_CHARS[crypto.randomInt(0, LOWERCASE_CHARS.length)]);
  chars.push(DIGIT_CHARS[crypto.randomInt(0, DIGIT_CHARS.length)]);
  chars.push(SYMBOL_CHARS[crypto.randomInt(0, SYMBOL_CHARS.length)]);

  // Fill the remaining 8 characters from the combined set to reach 12 characters
  for (let i = 0; i < 8; i++) {
    chars.push(ALL_CHARS[crypto.randomInt(0, ALL_CHARS.length)]);
  }

  // Fisher-Yates shuffle using crypto.randomInt
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const temp = chars[i];
    chars[i] = chars[j];
    chars[j] = temp;
  }

  return chars.join("");
};
