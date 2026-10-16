import type {
	SessionActor,
	SessionAuthenticator,
} from "@/application/SessionAuthenticator";
import type { Query } from "./Query";
export type GetAuthenticatedUserActor = SessionActor;
export type GetAuthenticatedUserOutput = {
	id: string;
	name: string;
	email: string;
	role: string;
};
export class GetAuthenticatedUser
	implements
		Query<GetAuthenticatedUserActor, undefined, GetAuthenticatedUserOutput>
{
	constructor(private readonly sessionAuthenticator: SessionAuthenticator) {}
	async execute(
		actor: GetAuthenticatedUserActor,
	): Promise<GetAuthenticatedUserOutput> {
		const user = await this.sessionAuthenticator.authenticate(actor);
		return {
			id: user.getId(),
			name: user.getName(),
			email: user.getEmail(),
			role: user.getRole(),
		};
	}
}
