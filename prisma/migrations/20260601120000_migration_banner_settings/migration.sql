ALTER TABLE "ServiceCapacitySettings" ADD COLUMN "migrationBannerEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ServiceCapacitySettings" ADD COLUMN "migrationBannerTitle" TEXT NOT NULL DEFAULT 'Обновите ссылку VPN';
ALTER TABLE "ServiceCapacitySettings" ADD COLUMN "migrationBannerText" TEXT NOT NULL DEFAULT 'После миграции нужно получить новую ссылку подписки и обновить ее в приложении.';
