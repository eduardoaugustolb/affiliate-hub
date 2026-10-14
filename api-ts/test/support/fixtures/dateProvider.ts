const NOW = new Date("2026-10-04T12:00:00Z");

export const dateProvider = {
	now: () => NOW,
	add: (ms: number) => new Date(NOW.getTime() + ms),
};
