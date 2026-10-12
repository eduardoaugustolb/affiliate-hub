import type { DateProvider } from "../DateProvider";

export class RuntimeDateProvider implements DateProvider {
	now(): Date {
		return new Date();
	}

	add(ms: number): Date {
		return new Date(this.now().getTime() + ms);
	}
}
