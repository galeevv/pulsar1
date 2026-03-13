import { prisma } from "@/lib/prisma";

export type LegalDocuments = {
  privacyPolicyText: string;
  publicOfferText: string;
  userAgreementText: string;
};

export const DEFAULT_USER_AGREEMENT_TEXT = `Пользовательское соглашение сервиса Pulsar

1. Общие положения
1.1. Настоящее соглашение регулирует использование сервиса Pulsar.
1.2. Используя сервис, пользователь подтверждает согласие с условиями документа.
`;

export const DEFAULT_PUBLIC_OFFER_TEXT = `Публичная оферта сервиса Pulsar

1. Предмет оферты
1.1. Исполнитель предоставляет доступ к сервису Pulsar на условиях оплаченной подписки.
1.2. Пользователь принимает условия оферты с момента оплаты.
`;

export const DEFAULT_PRIVACY_POLICY_TEXT = `Политика конфиденциальности сервиса Pulsar

1. Обработка данных
1.1. Сервис обрабатывает данные, необходимые для авторизации, работы подписки и поддержки.
1.2. Сервис применяет организационные и технические меры защиты информации.
`;

function normalizeDocumentText(text: string) {
  return text.trim();
}

function getDefaultLegalDocuments(): LegalDocuments {
  return {
    privacyPolicyText: DEFAULT_PRIVACY_POLICY_TEXT,
    publicOfferText: DEFAULT_PUBLIC_OFFER_TEXT,
    userAgreementText: DEFAULT_USER_AGREEMENT_TEXT,
  };
}

async function ensureLegalDocumentSettings() {
  const defaults = getDefaultLegalDocuments();

  const settings = await prisma.legalDocumentSettings.upsert({
    create: {
      id: 1,
      privacyPolicyText: defaults.privacyPolicyText,
      publicOfferText: defaults.publicOfferText,
      userAgreementText: defaults.userAgreementText,
    },
    update: {},
    where: { id: 1 },
  });

  const dataToFill: Partial<LegalDocuments> = {};

  if (!settings.userAgreementText.trim()) {
    dataToFill.userAgreementText = defaults.userAgreementText;
  }

  if (!settings.publicOfferText.trim()) {
    dataToFill.publicOfferText = defaults.publicOfferText;
  }

  if (!settings.privacyPolicyText.trim()) {
    dataToFill.privacyPolicyText = defaults.privacyPolicyText;
  }

  if (Object.keys(dataToFill).length === 0) {
    return settings;
  }

  return prisma.legalDocumentSettings.update({
    data: dataToFill,
    where: { id: 1 },
  });
}

export async function getLegalDocuments() {
  const settings = await ensureLegalDocumentSettings();

  return {
    privacyPolicyText: settings.privacyPolicyText,
    publicOfferText: settings.publicOfferText,
    userAgreementText: settings.userAgreementText,
  };
}

export async function saveLegalDocuments(input: LegalDocuments) {
  const normalizedDocuments: LegalDocuments = {
    privacyPolicyText: normalizeDocumentText(input.privacyPolicyText),
    publicOfferText: normalizeDocumentText(input.publicOfferText),
    userAgreementText: normalizeDocumentText(input.userAgreementText),
  };

  return prisma.legalDocumentSettings.upsert({
    create: {
      id: 1,
      privacyPolicyText: normalizedDocuments.privacyPolicyText,
      publicOfferText: normalizedDocuments.publicOfferText,
      userAgreementText: normalizedDocuments.userAgreementText,
    },
    update: {
      privacyPolicyText: normalizedDocuments.privacyPolicyText,
      publicOfferText: normalizedDocuments.publicOfferText,
      userAgreementText: normalizedDocuments.userAgreementText,
    },
    where: { id: 1 },
  });
}

export async function getUserAgreementText() {
  const documents = await getLegalDocuments();
  return documents.userAgreementText;
}

export async function saveUserAgreementText(text: string) {
  const documents = await getLegalDocuments();

  return saveLegalDocuments({
    ...documents,
    userAgreementText: text,
  });
}
