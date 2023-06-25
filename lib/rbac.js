// FIXME: Add tests

/**
 * @template {string | number | symbol} Roles
 * @param {Readonly<Record<Roles, Set<string>>>} roleMap
 * @param {Roles} role
 * @param {string} permission
 * @returns {boolean}
 */
const roleHasPermission = (roleMap, role, permission) => {
  const rolePermissions = roleMap[role];
  return rolePermissions ? rolePermissions.has(permission) : false;
};

/**
 * @template {string | number | symbol} Roles
 * @param {Readonly<Record<Roles, Set<string>>>} roleMap
 * @param {Roles[]} roles
 * @param {string} permission
 * @returns {boolean}
 */
const anyRoleHasPermission = (roleMap, roles, permission) => roles.some(role => roleHasPermission(roleMap, role, permission));

/**
 * @template {{ [key: string]: Set<string> }} ExistingRoles
 * @template {string} Role
 * @param {Readonly<ExistingRoles>} existingRoles
 * @param {Role} role
 * @param {...string} permissions
 * @returns {import("./advanced-types.js").AddRoleResult<Role | keyof ExistingRoles>}
 */
function rawAddRole (existingRoles, role, ...permissions) {
  if (Object.hasOwn(existingRoles, role)) {
    throw new Error(`Role "${role}" already set`);
  }

  /** @type {Readonly<Record<Role | keyof ExistingRoles, Set<string>>>} */
  const newRoles = {
    ...existingRoles,
    [role]: new Set(permissions),
  };

  return {
    addRole: (role, ...permissions) => rawAddRole(newRoles, role, ...permissions),
    done: () => {
      return {
        hasPermission: (role, permission) =>
          Array.isArray(role)
            ? anyRoleHasPermission(newRoles, role, permission)
            : roleHasPermission(newRoles, role, permission),
      };
    },
  };
}

/**
 * @template {string} Role
 * @param {Role} role
 * @param {...string} permissions
 * @returns {import("./advanced-types.js").AddRoleResult<Role>}
 */
export function addRole (role, ...permissions) {
  return rawAddRole({}, role, ...permissions);
}
