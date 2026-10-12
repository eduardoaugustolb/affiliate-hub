export interface Query<Actor, Input, Output> {
	execute(actor: Actor, input: Input): Promise<Output>;
}
