#!/usr/bin/env -S node --no-warnings
import { execSync } from 'node:child_process';
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function sh(cmd: string) { return execSync(cmd, { stdio: 'pipe' }).toString(); }

function parseVersionsFromText(text: string) {
  const lines = text.split(/\r?\n/);
  const local = new Set<string>();
  const remote = new Set<string>();
  const header = lines.find(l => /Local/i.test(l) && /Remote/i.test(l));
  let idxLocal = -1, idxRemote = -1;
  if (header) { idxLocal = header.indexOf('Local'); idxRemote = header.indexOf('Remote'); }
  for (const l of lines) {
    const matches = [...l.matchAll(/\d{14}/g)];
    if (matches.length === 0) continue;
    if (header && idxLocal >= 0 && idxRemote > idxLocal) {
      for (const m of matches) {
        const v = m[0];
        const pos = m.index ?? 0;
        if (pos < idxRemote) local.add(v); else remote.add(v);
      }
    } else {
      for (const m of matches) { local.add(m[0]); remote.add(m[0]); }
    }
  }
  return { local: [...local], remote: [...remote] };
}

console.log('🔍 Reconciling migration histories (remote vs local)...');

try {
  // Get remote migration history
  console.log('📋 Fetching remote migration history...');
  const pwd = process.env.SUPABASE_DB_PASSWORD ? ` --password "${process.env.SUPABASE_DB_PASSWORD}"` : '';
  const raw = sh(`supabase migration list --linked${pwd}`);
  const { local: remote = [], remote: remoteFromCols = [] } = parseVersionsFromText(raw);
  const remoteVersions = remoteFromCols.length ? remoteFromCols : remote;
  console.log(`Remote versions parsed: ${remoteVersions.length}`);

  // Get local migration history
  console.log('📁 Reading local migration files...');
  const localFiles = readdirSync('migrations').filter(f => /^(\d{14})_.*\.sql$/.test(f));
  const localVersions = localFiles.map(f => f.match(/^(\d{14})_/)![1]);
  console.log(`Local migrations: ${localVersions.length} found`);

  // Compute differences
  const A = new Set(localVersions);
  const B = new Set(remoteVersions);
  const remoteOnly = remoteVersions.filter(v => !A.has(v));
  const localOnly = localVersions.filter(v => !B.has(v));

  console.log(`\n📊 Migration History Analysis:`);
  console.log(`  Remote migrations: ${remoteVersions.length}`);
  console.log(`  Local migrations:  ${localVersions.length}`);
  console.log(`  Remote-only:       ${remoteOnly.length}`);
  console.log(`  Local-only:        ${localOnly.length}`);

  // Create stubs for remote-only versions
  if (remoteOnly.length > 0) {
    console.log('\n🔧 Creating stub files for remote-only versions...');
    for (const v of remoteOnly) {
      const path = join('migrations', `${v}_remote_schema.sql`);
      if (!existsSync(path)) {
        writeFileSync(path, `-- stub to align history (remote-only)\nDO $$ BEGIN /* no-op */ END $$;\n`);
        console.log(`  ✅ created stub: ${path}`);
      } else {
        console.log(`  ℹ️  stub already exists: ${path}`);
      }
    }
  }

  // Scan for unguarded PK additions
  console.log('\n🔍 Scanning for unguarded PRIMARY KEY additions...');
  const grep = sh("grep -R --line-number -E 'ADD CONSTRAINT .*PRIMARY KEY USING INDEX' migrations/ || true");
  const bad = grep.split('\n').filter(l => l && !/DO \$\$|END\$\$/.test(l));
  
  if (bad.length > 0) {
    console.error('\n❌ Unguarded PRIMARY KEY statements found:');
    bad.forEach(line => console.error(`  ${line}`));
    console.error('\n💡 Wrap these statements in DO $$ IF NOT EXISTS $$ blocks.');
    process.exit(1);
  } else {
    console.log('  ✅ All PRIMARY KEY additions are properly guarded');
  }

  // Emit outputs for workflow
  const gha = process.env.GITHUB_OUTPUT;
  if (gha) {
    writeFileSync(gha, `remote_only=${remoteOnly.join(' ')}\nlocal_only=${localOnly.join(' ')}\n`, { flag: 'a' });
  }

  // Print summary
  console.log('\n📋 Reconciliation Summary:');
  if (remoteOnly.length > 0) {
    console.log(`  Remote-only versions: [${remoteOnly.join(', ')}]`);
    console.log(`  → Created ${remoteOnly.length} stub file(s) for history alignment`);
  }
  if (localOnly.length > 0) {
    console.log(`  Local-only versions: [${localOnly.join(', ')}]`);
    console.log(`  → These need to be marked as applied on remote or removed locally`);
  }
  if (remoteOnly.length === 0 && localOnly.length === 0) {
    console.log('  ✅ Migration histories are aligned');
  }

  console.log('\n🎯 Reconciliation completed successfully');

} catch (error) {
  console.error('\n❌ Reconciliation failed:', error);
  process.exit(1);
}
