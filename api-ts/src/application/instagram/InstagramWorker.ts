import type { InstagramRepository } from "./InstagramPorts";
import type { ProcessInstagramEvent } from "./ProcessInstagramEvent";

/** Durable event leases may recover; uncertain external sends never expire automatically. */
export class InstagramWorker {
	private timer: ReturnType<typeof setTimeout> | undefined;
	private stopped = true;
	private running: Promise<void> | undefined;
	constructor(
		private readonly accountId: string,
		private readonly repository: InstagramRepository,
		private readonly processor: ProcessInstagramEvent,
	) {}
	async tick() {
		const event = await this.repository.claimEvent(this.accountId);
		if (!event) return;
		try {
			await this.repository.finishEvent(
				event.id,
				event.claim,
				await this.processor.execute(event),
			);
		} catch {
			await this.repository.retryEvent(event.id, event.claim);
		}
	}
	start() {
		if (!this.stopped) return;
		this.stopped = false;
		const next = () => {
			if (this.stopped) return;
			this.running = this.tick()
				.catch(() => {
					console.error("Instagram worker could not process a queued event");
				})
				.finally(() => {
					this.running = undefined;
					if (!this.stopped) this.timer = setTimeout(next, 1000);
				});
		};
		next();
	}
	async stop() {
		this.stopped = true;
		clearTimeout(this.timer);
		await this.running;
	}
}
