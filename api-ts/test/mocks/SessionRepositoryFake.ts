import type { IdGenerator } from "@/application/IdGenerator";
import { SessionRepositorySQL } from "@/infra/database/repositories/SessionRepositorySQL";
import type { DateProvider } from "@/infra/date/Provider";
import { SessionDAOFake } from "./SessionDAOFake";
export class SessionRepositoryFake extends SessionRepositorySQL {
	readonly fakeDAO: SessionDAOFake;
	constructor(idGenerator: IdGenerator, dateProvider: DateProvider) {
		const dao = new SessionDAOFake();
		super(dao, idGenerator, dateProvider);
		this.fakeDAO = dao;
	}
}
