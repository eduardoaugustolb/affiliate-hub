export type FetchHandler = (request: Request) => Promise<Response> | Response

export interface RunningServer {
  readonly port: number
  stop(): Promise<void>
}

export interface HttpRuntimeAdapter {
  serve(
    handler: FetchHandler,
    options: {
      port: number
      hostname?: string
    },
  ): Promise<RunningServer>
}
