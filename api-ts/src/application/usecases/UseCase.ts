export interface UseCase<Actor, Input, Output> {
	execute(actor: Actor, input: Input): Promise<Output>;
}
