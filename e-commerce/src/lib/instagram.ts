export type InstagramRule = {
  triggers: string[];
  target: string;
  privateReply?: string;
  publicReply?: string;
};
export type InstagramConfiguration = {
  name: string;
  enabled: boolean;
  source: "comment" | "message";
  postUrl: string | null;
  outfits: { number: string; code: string }[];
  rules: InstagramRule[];
};
export type InstagramCampaign = {
  id: string;
  configuration: InstagramConfiguration;
};
export type InstagramPreview = {
  matched: boolean;
  privateReply?: string;
  publicReply?: string;
};
export type InstagramHistory = {
  id: string;
  type: string;
  kind: string;
  status: string;
  action: string;
  code: string;
  result: string;
  attempts: number | null;
  createdAt: string;
};
export type InstagramData = {
  configured: boolean;
  username: string;
  campaigns: InstagramCampaign[];
  history: InstagramHistory[];
  error: string;
};
