import type { DateProvider } from "../Provider";

export class RuntimeDateProvider implements DateProvider {
	now(): Date {
		return new Date();
	}

	add(ms: number): Date {
		return new Date(this.now().getTime() + ms);
	}
}
