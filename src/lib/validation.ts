/**
 * Input validation utilities for API functions
 * Validates UUIDs, numeric ranges, and other data types to prevent injection and invalid data
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates that a string is a valid UUID v4
 */
export function validateUUID(value: unknown, fieldName = 'ID'): asserts value is string {
  if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
    throw new Error(`Invalid ${fieldName}: must be a valid UUID`);
  }
}

/**
 * Validates that a value is a positive number within a range
 */
export function validateNumericRange(
  value: unknown,
  fieldName = 'value',
  minValue = 0,
  maxValue = Number.MAX_SAFE_INTEGER
): asserts value is number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`Invalid ${fieldName}: must be a number`);
  }
  if (value < minValue || value > maxValue) {
    throw new Error(`Invalid ${fieldName}: must be between ${minValue} and ${maxValue}`);
  }
}

/**
 * Validates that a string is not empty and within length limits
 */
export function validateString(
  value: unknown,
  fieldName = 'value',
  minLength = 1,
  maxLength = 10000
): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${fieldName}: must be a string`);
  }
  if (value.length < minLength || value.length > maxLength) {
    throw new Error(`Invalid ${fieldName}: must be between ${minLength} and ${maxLength} characters`);
  }
}

/**
 * Validates that a value is a valid date string (ISO 8601)
 */
export function validateDateString(value: unknown, fieldName = 'date'): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${fieldName}: must be a string`);
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}: must be a valid ISO 8601 date`);
  }
}

/**
 * Validates that a value is a valid currency amount (numeric with up to 2 decimals)
 */
export function validateCurrencyAmount(value: unknown, fieldName = 'amount'): asserts value is number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`Invalid ${fieldName}: must be a number`);
  }
  if (value < 0) {
    throw new Error(`Invalid ${fieldName}: must not be negative`);
  }
  // Check for max 2 decimal places
  if (!Number.isInteger(value * 100)) {
    throw new Error(`Invalid ${fieldName}: must have at most 2 decimal places`);
  }
}

/**
 * Validates that a value is one of the allowed enum values
 */
export function validateEnum<T>(
  value: unknown,
  allowedValues: readonly T[],
  fieldName = 'value'
): asserts value is T {
  if (!allowedValues.includes(value as T)) {
    throw new Error(`Invalid ${fieldName}: must be one of ${allowedValues.join(', ')}`);
  }
}

/**
 * Type-safe assertion helper that validates multiple fields at once
 */
export function validateTripID(tripId: unknown): asserts tripId is string {
  validateUUID(tripId, 'trip ID');
}

export function validateUserID(userId: unknown): asserts userId is string {
  validateUUID(userId, 'user ID');
}

export function validateItemID(itemId: unknown): asserts itemId is string {
  validateUUID(itemId, 'item ID');
}

/**
 * Validates that an array of IDs are all valid UUIDs
 */
export function validateUUIDArray(values: unknown, fieldName = 'IDs'): asserts values is string[] {
  if (!Array.isArray(values)) {
    throw new Error(`Invalid ${fieldName}: must be an array`);
  }
  values.forEach((v, i) => {
    if (typeof v !== 'string' || !UUID_REGEX.test(v)) {
      throw new Error(`Invalid ${fieldName}[${i}]: must be a valid UUID`);
    }
  });
}
