# SQLite Backups (Ubuntu)

## 1) Prepare script

```bash
cd /opt/pulsar/app
chmod +x ops/backup-sqlite.sh
sudo apt-get update && sudo apt-get install -y sqlite3
```

## 2) Install systemd units

```bash
sudo cp ops/pulsar-sqlite-backup.service /etc/systemd/system/
sudo cp ops/pulsar-sqlite-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now pulsar-sqlite-backup.timer
```

## 3) Verify

```bash
systemctl status pulsar-sqlite-backup.timer
sudo systemctl start pulsar-sqlite-backup.service
ls -lah /opt/pulsar/backups
```

## 4) Destructive cleanup (backups + DB)

```bash
cd /var/www/1pulsar/app
chmod +x ops/cleanup-backups-and-db.sh

# Full cleanup: remove backup files + reset DB schema
ops/cleanup-backups-and-db.sh --yes

# Only backup files
ops/cleanup-backups-and-db.sh --yes --backups-only

# Only DB (drop and recreate schema)
ops/cleanup-backups-and-db.sh --yes --db-only
```
