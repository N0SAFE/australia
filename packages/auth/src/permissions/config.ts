import { PermissionBuilder } from "./system/builder/builder";
import { defaultStatements } from "better-auth/plugins/admin/access";

export const permissionConfig = PermissionBuilder.withDefaults(defaultStatements)
    .resource('capsule')
    /**/ .actions(['list', 'read', 'create', 'update', 'delete'])
    .roles((ac) => {
        return {
            admin: ac.newRole({
                capsule: ['list', 'read', 'create', 'update', 'delete']
                // user: ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password", "get", "update"],
                // session: ["list", "revoke", "delete"],
            }),

            sarah: ac.newRole({
                capsule: ['list', 'read']
                // user: ["get"],
                // session: ["list"],
            }),
        };
    });
