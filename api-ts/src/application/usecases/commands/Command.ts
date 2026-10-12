export interface Command<Actor, Input, Output> {
	execute(actor: Actor, input: Input): Promise<Output>;
}
