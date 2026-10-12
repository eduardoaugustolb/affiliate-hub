import type { DateProvider } from "../infra/DateProvider";

export class RuntimeDateProvider implements DateProvider {
	now(): Date {
		return new Date();
	}

	add(ms: number): Date {
		return new Date(this.now().getTime() + ms);
	}
}
