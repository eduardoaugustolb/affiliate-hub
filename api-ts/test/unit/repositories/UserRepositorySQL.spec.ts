import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { User } from "@/domain/entities/User";
import { UserRepositoryDatabase } from "@/infra/database/repositories/UserRepositoryDatabase";
import { UserDAOFake } from "../mocks/UserDAOFake";
import { UserRepositoryFake } from "../mocks/UserRepositoryFake";

const dateProvider = { now: () => new Date("2026-10-04T12:00:00Z") };
const row = {
	id: "persisted-id",
	name: "Eduardo",
	email: "eduardo@example.com",
	passwordHash: "password-hash",
	role: "admin",
	createdAt: dateProvider.now(),
	updatedAt: dateProvider.now(),
};
const factories = [
	{
		name: "SQL repository",
		create: (dao: UserDAOFake) =>
			new UserRepositoryDatabase(dao, { generate: () => row.id }),
	},
	{
		name: "repository fake",
		create: () => new UserRepositoryFake({ generate: () => row.id }),
	},
];
for (const factory of factories)
	describe(`User ${factory.name}`, () => {
		let dao: UserDAOFake;
		let repo: UserRepositoryDatabase;
		beforeEach(() => {
			dao = new UserDAOFake();
			repo = factory.create(dao);
			if ("fakeDAO" in repo) dao = repo.fakeDAO as UserDAOFake;
		});
		it("should generate an id and persist all fields on creation", async () => {
			const entity = User.create(
				row.name,
				row.email,
				row.passwordHash,
				row.role,
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
			const entity = User.rehydrate(
				row.id,
				row.name,
				row.email,
				row.passwordHash,
				row.role,
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
			expect(entity).toBeInstanceOf(User);
			expect(entity?.getId()).toBe(row.id);
			expect(entity?.getName()).toEqual(row.name);
			expect(entity?.getEmail()).toEqual(row.email);
			expect(entity?.getPasswordHash()).toEqual(row.passwordHash);
			expect(entity?.getRole()).toEqual(row.role);
		});
		it("should return null when id is missing", async () => {
			expect(await repo.findById("missing")).toBe(null);
		});
		it("should propagate lookup errors for id", async () => {
			const error = new Error("database unavailable");
			spyOn(dao, "findById").mockRejectedValueOnce(error);
			return expect(repo.findById("missing")).rejects.toBe(error);
		});
		it("should rehydrate all fields when finding by email", async () => {
			await dao.save(row);
			const entity = await repo.findByEmail(row.email);
			expect(entity).toBeInstanceOf(User);
			expect(entity?.getId()).toBe(row.id);
			expect(entity?.getName()).toEqual(row.name);
			expect(entity?.getEmail()).toEqual(row.email);
			expect(entity?.getPasswordHash()).toEqual(row.passwordHash);
			expect(entity?.getRole()).toEqual(row.role);
		});
		it("should return null when email is missing", async () => {
			expect(await repo.findByEmail("missing")).toBe(null);
		});
		it("should rehydrate the first admin", async () => {
			await dao.save(row);
			const user = await repo.findFirstAdmin();
			expect(user).toBeInstanceOf(User);
			expect(user?.getId()).toBe(row.id);
			expect(user?.getRole()).toBe("admin");
		});
		it("should return null when no admin exists", async () => {
			expect(await repo.findFirstAdmin()).toBeNull();
		});
		it("should propagate lookup errors for email", async () => {
			const error = new Error("database unavailable");
			spyOn(dao, "findByEmail").mockRejectedValueOnce(error);
			return expect(repo.findByEmail("missing")).rejects.toBe(error);
		});
		it("should update persisted data", async () => {
			await dao.save(row);
			const entity = User.rehydrate(
				row.id,
				row.name,
				row.email,
				row.passwordHash,
				row.role,
			);
			const update = spyOn(dao, "update");
			await repo.update(entity);
			expect(update).toHaveBeenCalledWith({
				id: row.id,
				name: row.name,
				email: row.email,
				passwordHash: row.passwordHash,
				role: row.role,
			});
		});
		it("should reject updates without an id", async () => {
			const update = spyOn(dao, "update");
			expect(
				repo.update(
					User.create(row.name, row.email, row.passwordHash, row.role),
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
				repo.save(User.create(row.name, row.email, row.passwordHash, row.role)),
			).rejects.toBe(error);
		});
		it("should propagate update errors", async () => {
			const error = new Error("update failed");
			spyOn(dao, "update").mockRejectedValueOnce(error);
			return expect(
				repo.update(
					User.rehydrate(
						row.id,
						row.name,
						row.email,
						row.passwordHash,
						row.role,
					),
				),
			).rejects.toBe(error);
		});
		it("should propagate deletion errors", async () => {
			const error = new Error("delete failed");
			spyOn(dao, "deleteById").mockRejectedValueOnce(error);
			return expect(repo.deleteById(row.id)).rejects.toBe(error);
		});
	});
