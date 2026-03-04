export type MarzbanUserCreateStatus = "active" | "on_hold";
export type MarzbanUserModifyStatus = "active" | "disabled" | "on_hold";

export type MarzbanUserSummary = {
  raw: unknown;
  status: string;
  subscriptionUrl?: string | null;
  username: string;
};

export interface MarzbanAdapter {
  healthCheck(): Promise<void>;

  createVpnUser(input: {
    username: string;
    expireAt?: Date | null;
    dataLimitBytes?: number | null;
    note?: string | null;
    status?: "active" | "disabled";
  }): Promise<{
    username: string;
    status: string;
    subscriptionUrl?: string | null;
    raw: unknown;
  }>;

  getVpnUser(username: string): Promise<{
    username: string;
    status: string;
    subscriptionUrl?: string | null;
    raw: unknown;
  } | null>;

  updateVpnUser(input: {
    username: string;
    expireAt?: Date | null;
    dataLimitBytes?: number | null;
    status?: "active" | "disabled";
    note?: string | null;
  }): Promise<{
    username: string;
    status: string;
    subscriptionUrl?: string | null;
    raw: unknown;
  }>;

  revokeVpnUser(username: string): Promise<void>;

  getSubscriptionUrl(username: string): Promise<string | null>;

  syncVpnUser(username: string): Promise<{
    username: string;
    status: string;
    subscriptionUrl?: string | null;
    raw: unknown;
  } | null>;
}
