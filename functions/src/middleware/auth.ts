/**
 * Authentication middleware for Express applications
 * 
 * @deprecated This file is kept for backward compatibility.
 * New code should import from ./httpAuthWrapper instead.
 * 
 * Re-exports authentication utilities from the centralized httpAuthWrapper module.
 */

export {
  verifyBearerToken as verifyBearer,
  verifyBearerToken,
  requirePermission,
  withBearerAuth,
  withCorsAndBearerAuth,
  withBearerAuthAndPermission,
  withCorsAndBearerAuthAndPermission,
  type AuthenticatedRequest,
  type AuthenticatedFunctionsRequest,
} from './httpAuthWrapper';
