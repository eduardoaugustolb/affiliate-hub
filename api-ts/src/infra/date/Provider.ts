export interface DateProvider {
	now(): Date;
	add(ms: number): Date;
}
