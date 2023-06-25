// FIXME: Add tests

/** @typedef {{ readonly [role: string]: { readonly [context: string]: Set<string> } }} RoleContextPermissionMap */

/**
 * @param {Readonly<RoleContextPermissionMap>} roleMap
 * @param {string} role
 * @param {string} context
 * @param {string} operation
 * @returns {boolean}
 */
const roleHasPermission = (roleMap, role, context, operation) => {
  const roleContexts = roleMap[role];

  if (!roleContexts) return false;

  const contextOperations = roleContexts[context] || roleContexts['*'];

  if (!contextOperations) return false;

  return contextOperations.has(operation) || contextOperations.has('*');
};

/**
 * @param {Readonly<RoleContextPermissionMap>} roleMap
 * @param {string[]} roles
 * @param {string} context
 * @param {string} operation
 * @returns {boolean}
 */
const anyRoleHasPermission = (roleMap, roles, context, operation) =>
  roles.some(role => roleHasPermission(roleMap, role, context, operation));

/**
 * @callback AddRolePermission
 * @param {string} role
 * @param {string} context
 * @param {...string} operations
 * @returns {AddRoleResult}
 */

/**
 * @callback HasPermission
 * @param {string[]|string} role
 * @param {string} context
 * @param {string|undefined} [operation]
 * @returns {boolean}
 */

/**
 * @typedef RoleSetupDone
 * @property {HasPermission} hasPermission
 */

/**
 * @typedef AddRoleResult
 * @property {AddRolePermission} addRolePermission
 * @property {() => RoleSetupDone} done
 */

/**
 * @param {Readonly<RoleContextPermissionMap>} roleMap
 * @param {string} role
 * @param {string} context
 * @param {...string} operations
 * @returns {AddRoleResult}
 */
function rawAddRole (roleMap, role, context, ...operations) {
  const rolePermissions = roleMap[role] || {};

  if (Object.hasOwn(rolePermissions, context)) {
    throw new Error(`Context "${context}" has already been set for "${role}"`);
  }

  /** @type {Readonly<RoleContextPermissionMap>} */
  const newRoleMap = {
    ...roleMap,
    [role]: {
      ...rolePermissions,
      [context]: new Set(operations.length ? operations : '*'),
    },
  };

  return {
    addRolePermission: (...values) => rawAddRole(newRoleMap, ...values),
    done: () => {
      return {
        hasPermission: (role, context, operation = '*') =>
          Array.isArray(role)
            ? anyRoleHasPermission(newRoleMap, role, context, operation)
            : roleHasPermission(newRoleMap, role, context, operation),
      };
    },
  };
}

/**
 * @param {string} role
 * @param {string} context
 * @param {...string} operations
 * @returns {AddRoleResult}
 */
export function addRolePermission (role, context, ...operations) {
  return rawAddRole({}, role, context, ...operations);
}
