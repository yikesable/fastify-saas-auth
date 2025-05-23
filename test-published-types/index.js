/// <reference path="advanced-types.d.ts" />

import { addRolePermission } from '@yikesable/fastify-saas-auth';

export const {
  hasPermission,
} =
  addRolePermission('admin:foo', '*')
    .addRolePermission('admin:bar', '*')
    .addRolePermission('editor:foo', 'create', 'edit')
    .addRolePermission('editor:bar', 'wow')
    .done();

if (hasPermission('admin', 'foo', 'create') === true) {
  console.log('Hi');
}
