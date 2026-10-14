export type FetchHandler = (request: Request) => Promise<Response> | Response;

export interface RunningHttpServer {
	readonly port: number;
	stop(): Promise<void>;
}

export interface HttpRestRuntime {
	serve(
		handler: FetchHandler,
		options: {
			port: number;
			hostname?: string;
		},
	): Promise<RunningHttpServer>;
}
