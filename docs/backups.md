# Backups and the local copy

The live data is in Supabase. Two things keep a copy on this Mac.

## 1. Backups (`npm run backup`)

Writes `~/prequate-table-backups/<date-time>/db.json` (every table) and copies every
file in the three Supabase buckets into `data/uploads` (names kept, existing files
skipped). Keeps the last 14 database backups. It only reads from Supabase.

Backups hold members' personal data. They live outside the project folder, are not
in git, and the folder is readable only by this user. Keep FileVault on, and keep the
folder out of iCloud or Dropbox.

The schedule is a macOS launch agent, twice a day (02:00 and 14:00, run on wake if the
Mac was asleep). File: `scripts/one.prequate.table-backup.plist`.

    cp scripts/one.prequate.table-backup.plist ~/Library/LaunchAgents/
    launchctl load ~/Library/LaunchAgents/one.prequate.table-backup.plist

Turn it off: `launchctl unload ~/Library/LaunchAgents/one.prequate.table-backup.plist`.
Log: `~/prequate-table-backups/backup.log`.

## 2. A local working copy (Postgres on this Mac)

Listens only on 127.0.0.1:54329. Data in `data/local-db`.

    npm run local:refresh   take a fresh backup, then make the local database an exact copy of it
    npm run local:start     start it
    npm run local:stop      stop it
    npm run local:status    running? how many rows?

Run an app against it, with Supabase switched off for that run:

    npm run dev:member:offline
    npm run dev:admin:offline

Changes made while offline stay in the local database and are replaced by the next
refresh. They do not go back to Supabase.

## Restoring

`node scripts/restore-backup.cjs <backup folder | latest> --reset` loads a backup into
the database named by `DATABASE_URL`. It refuses any database that is not on this
machine unless `--allow-remote` is given.

To rebuild Supabase from a backup: create the project, run `npm run db:migrate`
against it, restore with `--allow-remote`, then copy `data/uploads` files back into
the buckets with `node scripts/move-uploads-to-supabase.cjs --go` (it knows which file
belongs where from the database rows).
