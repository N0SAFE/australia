import { permissionConfig } from "./config";

export const commonPermissions = {
    // projectReadOnly: permissionConfig.createPermission({
    //     project: ["read"],
    // }),

    // organizationReadOnly: permissionConfig.createPermission({
    //     organization: ["read"],
    // }),

    // userManagement: permissionConfig.createPermission(({ statementsConfig }) => ({
    //     user: statementsConfig.get("user").all(),
    // })),

    // userViewing: permissionConfig.createPermission(({ statementsConfig }) => ({
    //     user: statementsConfig.get("user").pick(["list", "get"]),
    // })),

    // sessionManagement: permissionConfig.createPermission(({ statementsConfig }) => ({
    //     session: statementsConfig.get("session").all(),
    // })),

    // sessionViewing: permissionConfig.createPermission({
    //     session: ["list"],
    // }),

    // billingReadOnly: permissionConfig.createPermission({
    //     billing: ["read"],
    // }),

    // analyticsReadOnly: permissionConfig.createPermission({
    //     analytics: ["read"],
    // }),

    // systemMonitoring: permissionConfig.createPermission({
    //     system: ["monitor"],
    // }),

    // // Using collection API to get read-only access across all resources
    // readOnlyAccess: permissionConfig.createPermission(({ statementsConfig }) => 
    //     statementsConfig.getAll().readOnly()
    // ),

    // // Using collection API to get all resources with all actions
    // superAdminAccess: permissionConfig.createPermission(({ statementsConfig }) => 
    //     statementsConfig.getAll().all()
    // ),

    // // Using collection API to get only CRUD operations across all resources
    // crudAccess: permissionConfig.createPermission(({ statementsConfig }) => 
    //     statementsConfig.getAll().crudOnly()
    // ),

    // // Using collection API to get write operations (create, update, delete) across all resources
    // writeAccess: permissionConfig.createPermission(({ statementsConfig }) => 
    //     statementsConfig.getAll().writeOnly()
    // ),

    // // Using collection API to pick specific actions across all resources
    // listAndReadAccess: permissionConfig.createPermission(({ statementsConfig }) => 
    //     statementsConfig.getAll().pick(["list"])
    // ),

    // // Using collection API to omit dangerous actions across all resources
    // safeModeAccess: permissionConfig.createPermission(({ statementsConfig }) => 
    //     statementsConfig.getAll().omit(["delete"])
    // ),
} as const;

export type CommonPermissionKeys = keyof typeof commonPermissions;

export type CommonPermission<T extends CommonPermissionKeys> = (typeof commonPermissions)[T];
