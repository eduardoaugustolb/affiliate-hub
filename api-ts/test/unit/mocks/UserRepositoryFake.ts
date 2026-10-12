import type { IdGenerator } from "@/application/IdGenerator";
import { UserRepositorySQL } from "@/infra/database/repositories/UserRepositorySQL";

import { UserDAOFake } from "./UserDAOFake";
export class UserRepositoryFake extends UserRepositorySQL {
	readonly fakeDAO: UserDAOFake;
	constructor(idGenerator: IdGenerator) {
		const dao = new UserDAOFake();
		super(dao, idGenerator);
		this.fakeDAO = dao;
	}
}
