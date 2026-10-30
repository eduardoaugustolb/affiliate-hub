import { expect, test } from "bun:test";
import {
	type CampaignConfiguration,
	InstagramCampaign,
	type InstagramRule,
} from "@/domain/entities/InstagramCampaign";

const configuration = (): CampaignConfiguration & {
	rules: [InstagramRule, InstagramRule];
} => ({
	name: "Looks",
	enabled: true,
	source: "comment",
	postUrl: "https://www.instagram.com/reel/ABC_123/",
	outfits: [
		{ number: "01", code: "OUT-AAAAAAAAAAAAAAAA" },
		{ number: "02", code: "OUT-BBBBBBBBBBBBBBBB" },
	],
	rules: [
		{
			triggers: ["links"],
			target: "all",
			privateReply: "{lista_outfits}",
			publicReply: "Enviei na DM!",
		},
		{ triggers: ["Link 01"], target: "01", privateReply: "{nome}: {url}" },
	],
});

test("matches configured expressions exactly and resolves numbered outfits within the post", () => {
	const campaign = new InstagramCampaign(configuration());
	expect(campaign.match(" LINKS ")?.target).toBe("all");
	expect(campaign.match(" link   01 ")?.target).toBe("01");
	expect(campaign.match("não quero links")).toBeUndefined();
	expect(campaign.match("link 1")).toBeUndefined();
	const list = campaign.match("links"),
		single = campaign.match("link 01");
	if (!list || !single) throw new Error("Missing rules");
	expect(campaign.selectedOutfits(list)).toHaveLength(2);
	expect(campaign.selectedOutfits(single)[0]?.code).toBe(
		"OUT-AAAAAAAAAAAAAAAA",
	);
});

test("rejects conflicting triggers, duplicate numbers, unknown targets and invalid template variables", () => {
	for (const change of [
		(c: ReturnType<typeof configuration>) =>
			c.rules.push({
				triggers: [" LINKS "],
				target: "all",
				privateReply: "Olá",
			}),
		(c: ReturnType<typeof configuration>) =>
			c.outfits.push({ number: "01", code: "OUT-CCCCCCCCCCCCCCCC" }),
		(c: ReturnType<typeof configuration>) => {
			c.rules[0].target = "99";
		},
		(c: ReturnType<typeof configuration>) => {
			c.rules[0].privateReply = "{secret}";
		},
		(c: ReturnType<typeof configuration>) => {
			c.rules[0].privateReply = "{url}";
		},
	]) {
		const input = configuration();
		change(input);
		expect(() => new InstagramCampaign(input)).toThrow();
	}
});

test("paused campaigns do not match; DMs require explicit outfit targets and cannot reply publicly", () => {
	expect(
		new InstagramCampaign({ ...configuration(), enabled: false }).match(
			"links",
		),
	).toBeUndefined();
	expect(
		() =>
			new InstagramCampaign({
				...configuration(),
				source: "message",
				postUrl: null,
			}),
	).toThrow();
	const dm = configuration();
	dm.source = "message";
	dm.postUrl = null;
	delete dm.rules[0].publicReply;
	expect(new InstagramCampaign(dm).match("links")).toBeDefined();
});

test("rejects arbitrary URLs and copies configuration to protect aggregate invariants", () => {
	for (const postUrl of [
		"https://evil.test/reel/abc/",
		"https://instagram.com.evil.test/p/a/",
		"http://instagram.com/p/a/",
		"https://instagram.com/stories/a/",
	]) {
		expect(
			() => new InstagramCampaign({ ...configuration(), postUrl }),
		).toThrow();
	}
	const input = configuration();
	const campaign = new InstagramCampaign(input);
	input.rules[0].triggers.push("unexpected");
	expect(campaign.match("unexpected")).toBeUndefined();
});
