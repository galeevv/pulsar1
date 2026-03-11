import type {
  SupportSenderType,
  SupportTicketCategory,
  SupportTicketStatus,
} from "@/lib/support/constants";

export type SerializedSupportMessage = {
  createdAt: string;
  id: number;
  message: string;
  senderId: string | null;
  senderType: SupportSenderType;
};

export type UserSupportTicketListItemSerialized = {
  category: SupportTicketCategory;
  id: number;
  lastMessageAt: string | null;
  status: SupportTicketStatus;
  subject: string;
  unreadForUser: boolean;
  updatedAt: string;
};

export type UserSupportTicketDetailSerialized = {
  adminLastReadAt: string | null;
  category: SupportTicketCategory;
  closedAt: string | null;
  createdAt: string;
  id: number;
  lastMessageAt: string | null;
  messages: SerializedSupportMessage[];
  status: SupportTicketStatus;
  subject: string;
  updatedAt: string;
  userCanReply: boolean;
  userLastReadAt: string | null;
};

export type UserSupportTicketListResponse = {
  tickets: UserSupportTicketListItemSerialized[];
};

export type UserSupportTicketDetailResponse = {
  ticket: UserSupportTicketDetailSerialized;
};

export type UserSupportTicketCreateResponse = {
  ticketId: number;
};

export type AdminSupportTicketListItemSerialized = {
  adminLastReadAt: string | null;
  category: SupportTicketCategory;
  createdAt: string;
  id: number;
  lastMessageAt: string | null;
  status: SupportTicketStatus;
  subject: string;
  unreadForAdmin: boolean;
  updatedAt: string;
  user: {
    id: string;
    username: string;
  };
};

export type AdminSupportTicketDetailSerialized = {
  adminLastReadAt: string | null;
  category: SupportTicketCategory;
  closedAt: string | null;
  createdAt: string;
  id: number;
  lastMessageAt: string | null;
  messages: SerializedSupportMessage[];
  status: SupportTicketStatus;
  subject: string;
  updatedAt: string;
  user: {
    activeSubscription: {
      deviceLimit: number;
      devices: number;
      endsAt: string;
      status: "ACTIVE" | "EXPIRED" | "REVOKED";
      tariffName: string;
    } | null;
    id: string;
    username: string;
  };
  userLastReadAt: string | null;
};

export type AdminSupportTicketListResponse = {
  tickets: AdminSupportTicketListItemSerialized[];
};

export type AdminSupportTicketDetailResponse = {
  ticket: AdminSupportTicketDetailSerialized;
};

export type SupportApiError = {
  error?: string;
};
