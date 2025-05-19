
/**
 * Middleware scope items
 * */
export const MiddlewareScopeItems = ['rest-app', 'controller', 'endpoint'] as const;
// noinspection JSUnusedGlobalSymbols
/**
 * Middleware Scope
 * */
export type MiddlewareScope = typeof MiddlewareScopeItems[number];
