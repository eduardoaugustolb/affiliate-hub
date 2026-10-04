import type { DateProvider } from "../Provider";

export class RuntimeDateProvider implements DateProvider {
	now(): Date {
		return new Date();
	}
}
