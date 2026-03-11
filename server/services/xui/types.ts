export type XuiUserStatus = "active" | "disabled";

export type XuiUserSummary = {
  raw: unknown;
  status: string;
  subscriptionUrl?: string | null;
  username: string;
};

export interface XuiAdapter {
  healthCheck(): Promise<void>;

  createVpnUser(input: {
    username: string;
    expireAt?: Date | null;
    dataLimitBytes?: number | null;
    limitIp?: number | null;
    note?: string | null;
    status?: XuiUserStatus;
  }): Promise<XuiUserSummary>;

  getVpnUser(username: string): Promise<XuiUserSummary | null>;

  updateVpnUser(input: {
    username: string;
    expireAt?: Date | null;
    dataLimitBytes?: number | null;
    limitIp?: number | null;
    status?: XuiUserStatus;
    note?: string | null;
  }): Promise<XuiUserSummary>;

  revokeVpnUser(username: string): Promise<void>;

  getSubscriptionUrl(username: string): Promise<string | null>;

  syncVpnUser(username: string): Promise<XuiUserSummary | null>;
}
