export interface Command<Actor, Input> {
	execute(actor: Actor, input: Input): Promise<void>;
}
