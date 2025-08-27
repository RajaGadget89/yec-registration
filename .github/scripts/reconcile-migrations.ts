#!/usr/bin/env -S node --no-warnings
import { execSync } from 'node:child_process';
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function sh(cmd: string) { return execSync(cmd, { stdio: 'pipe' }).toString(); }

console.log('🔍 Reconciling migration histories (remote vs local)...');

try {
  // Get remote migration history
  console.log('📋 Fetching remote migration history...');
  const out = sh('supabase migration list --linked --format json');
  const remote: string[] = JSON.parse(out).map((r: any) => r.version);
  console.log(`Remote migrations: ${remote.length} found`);

  // Get local migration history
  console.log('📁 Reading local migration files...');
  const localFiles = readdirSync('migrations').filter(f => /^(\d{14})_.*\.sql$/.test(f));
  const local = localFiles.map(f => f.match(/^(\d{14})_/)![1]);
  console.log(`Local migrations: ${local.length} found`);

  // Compute differences
  const set = (a: string[]) => new Set(a);
  const A = set(local), B = set(remote);
  const remoteOnly = remote.filter(v => !A.has(v));
  const localOnly = local.filter(v => !B.has(v));

  console.log(`\n📊 Migration History Analysis:`);
  console.log(`  Remote migrations: ${remote.length}`);
  console.log(`  Local migrations:  ${local.length}`);
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
