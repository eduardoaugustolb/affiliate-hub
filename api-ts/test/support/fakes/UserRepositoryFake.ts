import type { IdGenerator } from "@/application/IdGenerator";
import { UserRepositoryDatabase } from "@/infra/database/repositories/UserRepositoryDatabase";

import { UserDAOFake } from "./UserDAOFake";
export class UserRepositoryFake extends UserRepositoryDatabase {
	readonly fakeDAO: UserDAOFake;
	constructor(idGenerator: IdGenerator) {
		const dao = new UserDAOFake();
		super(dao, idGenerator);
		this.fakeDAO = dao;
	}
}
