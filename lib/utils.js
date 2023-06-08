/**
 * @param {unknown} value
 * @returns {value is unknown[]}
 */
export function isUnknownArray (value) {
  return Array.isArray(value);
}

/**
 * @template T
 * @param {Promise<T>} awaitable
 * @param {string} message
 * @returns {Promise<T>}
 */
export function catchWrap (awaitable, message) {
  // eslint-disable-next-line promise/prefer-await-to-then
  return awaitable.catch(/** @param {unknown} cause */ cause => {
    throw new Error(message, { cause });
  });
}

/**
 * @template {{ [key: string]: any }} T
 * @param {T} input
 * @returns {{ [P in keyof T]?: Exclude<T[P], undefined> }}
 */
export function filterUndefinedObjectValues (input) {
  /** @type {{ [P in keyof T]?: Exclude<T[P], undefined> }} */
  const result = {};

  for (const key in input) {
    if (input[key] !== undefined) {
      result[key] = input[key];
    }
  }

  return result;
}

/**
 * @template {any} T
 * @template {keyof T} K
 * @param {T} input
 * @param {K[]|ReadonlyArray<K>} keys
 * @returns {Pick<T, K>}
 */
export function pick (input, keys) {
  /** @type {Partial<Pick<T, K>>} */
  const result = {};
  for (const key of keys) {
    result[key] = input[key];
  }
  return /** @type {Pick<T, K>} */ (result);
}
