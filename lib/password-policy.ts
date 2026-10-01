/**
 * Password policy constants shared by the client forms and the server schemas.
 *
 * Deliberately free of server-only imports so a form can import it directly and
 * stay in sync with the Zod validation in `lib/validations.ts`.
 */

/**
 * Length is the dominant factor in password strength, so the floor is 10
 * characters rather than a symbol-class rule that pushes people toward
 * `Password1!`.
 */
export const MIN_PASSWORD_LENGTH = 10;

/** Upper bound accepted by the server, to bound scrypt input cost. */
export const MAX_PASSWORD_LENGTH = 200;