require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { checkDatabase } = require('../src/lib/checkDb')

checkDatabase().then((result) => {
  console.log('\nSmart Matatu — Database check\n')
  for (const [table, info] of Object.entries(result.tables)) {
    console.log(info.ok ? `  ✓ ${table}` : `  ✗ ${table} — ${info.error}`)
  }
  console.log(result.ready ? '\n✓ Database ready!\n' : '\n✗ Run supabase/setup-all.sql in Supabase SQL Editor\n')
  process.exit(result.ready ? 0 : 1)
})
