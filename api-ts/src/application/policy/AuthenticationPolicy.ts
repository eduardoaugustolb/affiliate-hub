/** Centralizes authentication settings used by application use cases. */
export class AuthenticationPolicy {
	// The PRD requires an expiration but does not specify a duration.
	static readonly sessionDurationMs = 7 * 24 * 60 * 60 * 1000;
	static readonly sessionTokenBytes = 32;
}
