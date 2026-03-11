import { prisma } from "@/lib/prisma";

export const DEFAULT_USER_AGREEMENT_TEXT = `Пользовательское соглашение сервиса Pulsar

1. Общие положения
1.1. Настоящее соглашение регулирует использование сервиса Pulsar.
1.2. Используя сервис, пользователь подтверждает согласие с условиями соглашения.

2. Доступ к сервису
2.1. Доступ предоставляется через личный кабинет по адресу 1pulsar.space.
2.2. Регистрация в MVP-версии доступна только по invite/referral коду.
2.3. Пользователь обязан обеспечивать конфиденциальность своих учетных данных.

3. Подписка и оплата
3.1. Пользователь самостоятельно выбирает срок подписки и количество устройств в рамках доступного диапазона.
3.2. Стоимость подписки рассчитывается автоматически на этапе оформления заказа.
3.3. Оплата считается завершенной после фиксации статуса платежа в системе.

4. Правила использования
4.1. Пользователь обязуется использовать сервис в рамках применимого законодательства.
4.2. Запрещено использовать сервис для действий, нарушающих права третьих лиц, безопасности сетей и сервисов.
4.3. Администрация вправе ограничить доступ при нарушении условий соглашения.

5. Ограничение ответственности
5.1. Сервис предоставляется по модели "как есть".
5.2. Администрация не гарантирует абсолютную бесперебойность работы, но предпринимает разумные меры для стабильности сервиса.

6. Изменение соглашения
6.1. Администрация вправе обновлять условия соглашения.
6.2. Актуальная редакция всегда публикуется на странице /rules.

7. Контакты
7.1. По вопросам работы сервиса пользователь может обратиться в поддержку через официальные каналы Pulsar.
`;

async function ensureLegalDocumentSettings() {
  const settings = await prisma.legalDocumentSettings.upsert({
    create: {
      id: 1,
      userAgreementText: DEFAULT_USER_AGREEMENT_TEXT,
    },
    update: {},
    where: { id: 1 },
  });

  if (settings.userAgreementText.trim().length > 0) {
    return settings;
  }

  return prisma.legalDocumentSettings.update({
    data: {
      userAgreementText: DEFAULT_USER_AGREEMENT_TEXT,
    },
    where: { id: 1 },
  });
}

export async function getUserAgreementText() {
  const settings = await ensureLegalDocumentSettings();
  return settings.userAgreementText;
}

export async function saveUserAgreementText(text: string) {
  const normalizedText = text.trim();

  return prisma.legalDocumentSettings.upsert({
    create: {
      id: 1,
      userAgreementText: normalizedText,
    },
    update: {
      userAgreementText: normalizedText,
    },
    where: { id: 1 },
  });
}
