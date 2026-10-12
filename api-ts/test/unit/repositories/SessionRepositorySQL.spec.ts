import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { Session } from "@/domain/entities/Session";
import { SessionRepositoryDatabase } from "@/infra/database/repositories/SessionRepositoryDatabase";
import { SessionDAOFake } from "../mocks/SessionDAOFake";
import { SessionRepositoryFake } from "../mocks/SessionRepositoryFake";

const expiresAt = new Date("2026-10-04T13:00:00Z");
const dateProvider = {
	now: () => new Date("2026-10-04T12:00:00Z"),
	add: (ms: number) => new Date(Date.parse("2026-10-04T12:00:00Z") + ms),
};
const row = {
	id: "persisted-id",
	userId: "user-123",
	tokenHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
	expiresAt: expiresAt,
	revokedAt: null,
	createdAt: dateProvider.now(),
	updatedAt: dateProvider.now(),
};
const factories = [
	{
		name: "SQL repository",
		create: (dao: SessionDAOFake) =>
			new SessionRepositoryDatabase(
				dao,
				{ generate: () => row.id },
				dateProvider,
			),
	},
	{
		name: "repository fake",
		create: () =>
			new SessionRepositoryFake({ generate: () => row.id }, dateProvider),
	},
];
for (const factory of factories)
	describe(`Session ${factory.name}`, () => {
		let dao: SessionDAOFake;
		let repo: SessionRepositoryDatabase;
		beforeEach(() => {
			dao = new SessionDAOFake();
			repo = factory.create(dao);
			if ("fakeDAO" in repo) dao = repo.fakeDAO as SessionDAOFake;
		});
		it("should generate an id and persist all fields on creation", async () => {
			const entity = Session.create(
				expiresAt,
				row.userId,
				row.tokenHash,
				dateProvider,
			);
			await repo.save(entity);
			const stored = await dao.findById(row.id);
			expect(stored).toMatchObject({
				...row,
				createdAt: expect.any(Date),
				updatedAt: expect.any(Date),
			});
			expect(entity.getId()).toBe("");
		});
		it("should preserve an existing id when saving", async () => {
			const entity = Session.rehydrate(
				row.id,
				row.expiresAt,
				row.revokedAt,
				row.userId,
				row.tokenHash,
				dateProvider,
			);
			await repo.save(entity);
			expect(await dao.findById(row.id)).toMatchObject({
				...row,
				createdAt: expect.any(Date),
				updatedAt: expect.any(Date),
			});
		});
		it("should rehydrate all fields when finding by id", async () => {
			await dao.save(row);
			const entity = await repo.findById(row.id);
			expect(entity).toBeInstanceOf(Session);
			expect(entity?.getId()).toBe(row.id);
			expect(entity?.getUserId()).toEqual(row.userId);
			expect(entity?.getTokenHash()).toEqual(row.tokenHash);
			expect(entity?.getExpiresAt()).toEqual(row.expiresAt);
			expect(entity?.getRevokedAt()).toEqual(row.revokedAt);
		});
		it("should return null when id is missing", async () => {
			expect(await repo.findById("missing")).toBe(null);
		});
		it("should propagate lookup errors for id", async () => {
			const error = new Error("database unavailable");
			spyOn(dao, "findById").mockRejectedValueOnce(error);
			return expect(repo.findById("missing")).rejects.toBe(error);
		});
		it("should rehydrate all fields when finding by tokenHash", async () => {
			await dao.save(row);
			const entity = await repo.findByTokenHash(row.tokenHash);
			expect(entity).toBeInstanceOf(Session);
			expect(entity?.getId()).toBe(row.id);
			expect(entity?.getUserId()).toEqual(row.userId);
			expect(entity?.getTokenHash()).toEqual(row.tokenHash);
			expect(entity?.getExpiresAt()).toEqual(row.expiresAt);
			expect(entity?.getRevokedAt()).toEqual(row.revokedAt);
		});
		it("should return null when tokenHash is missing", async () => {
			expect(await repo.findByTokenHash("missing")).toBe(null);
		});
		it("should propagate lookup errors for tokenHash", async () => {
			const error = new Error("database unavailable");
			spyOn(dao, "findByTokenHash").mockRejectedValueOnce(error);
			return expect(repo.findByTokenHash("missing")).rejects.toBe(error);
		});
		it("should update persisted data", async () => {
			await dao.save(row);
			const entity = Session.rehydrate(
				row.id,
				row.expiresAt,
				row.revokedAt,
				row.userId,
				row.tokenHash,
				dateProvider,
			);
			const update = spyOn(dao, "update");
			await repo.update(entity);
			expect(update).toHaveBeenCalledWith({
				id: row.id,
				userId: row.userId,
				tokenHash: row.tokenHash,
				expiresAt: row.expiresAt,
				revokedAt: row.revokedAt,
			});
		});
		it("should reject updates without an id", async () => {
			const update = spyOn(dao, "update");
			expect(
				repo.update(
					Session.create(expiresAt, row.userId, row.tokenHash, dateProvider),
				),
			).rejects.toThrow("without an id");
			expect(update).not.toHaveBeenCalled();
		});
		it("should delete a persisted entity", async () => {
			await dao.save(row);
			await repo.deleteById(row.id);
			expect(await repo.findById(row.id)).toBe(null);
		});
		it("should propagate save errors", async () => {
			const error = new Error("insert failed");
			spyOn(dao, "save").mockRejectedValueOnce(error);
			return expect(
				repo.save(
					Session.create(expiresAt, row.userId, row.tokenHash, dateProvider),
				),
			).rejects.toBe(error);
		});
		it("should propagate update errors", async () => {
			const error = new Error("update failed");
			spyOn(dao, "update").mockRejectedValueOnce(error);
			return expect(
				repo.update(
					Session.rehydrate(
						row.id,
						row.expiresAt,
						row.revokedAt,
						row.userId,
						row.tokenHash,
						dateProvider,
					),
				),
			).rejects.toBe(error);
		});
		it("should propagate deletion errors", async () => {
			const error = new Error("delete failed");
			spyOn(dao, "deleteById").mockRejectedValueOnce(error);
			return expect(repo.deleteById(row.id)).rejects.toBe(error);
		});
		it("should preserve revocation on rehydration", async () => {
			await dao.save({ ...row, revokedAt: dateProvider.now() });
			expect((await repo.findById(row.id))?.getRevokedAt()).toEqual(
				dateProvider.now(),
			);
		});
	});
