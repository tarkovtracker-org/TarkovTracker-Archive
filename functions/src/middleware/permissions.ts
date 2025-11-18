/**
 * Permission checking middleware for Express applications
 *
 * @deprecated This file is kept for backward compatibility.
 * New code should import from ./httpAuthWrapper instead.
 *
 * Re-exports permission utilities from the centralized httpAuthWrapper module.
 */

export { requirePermission, type AuthenticatedRequest } from './httpAuthWrapper.js';
