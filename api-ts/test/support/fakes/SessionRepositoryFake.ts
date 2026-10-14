import type { IdGenerator } from "@/application/IdGenerator";
import type { DateProvider } from "@/infra/DateProvider";
import { SessionRepositoryDatabase } from "@/infra/database/repositories/SessionRepositoryDatabase";
import { SessionDAOFake } from "./SessionDAOFake";
export class SessionRepositoryFake extends SessionRepositoryDatabase {
	readonly fakeDAO: SessionDAOFake;
	constructor(idGenerator: IdGenerator, dateProvider: DateProvider) {
		const dao = new SessionDAOFake();
		super(dao, idGenerator, dateProvider);
		this.fakeDAO = dao;
	}
}
