require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

async function main() {
  const url = process.env.DATABASE_URL

  if (!url || url.includes('[YOUR-PASSWORD]')) {
    console.error('\nMissing DATABASE_URL in backend/.env\n')
    console.error('1. Supabase Dashboard → Project Settings → Database')
    console.error('2. Copy your database password')
    console.error('3. Add to backend/.env:')
    console.error(
      '   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.wbvzyxkacxthxmcdmtoe.supabase.co:5432/postgres\n'
    )
    process.exit(1)
  }

  const sqlPath = path.join(__dirname, '../../supabase/setup-all.sql')
  if (!fs.existsSync(sqlPath)) {
    console.error('Missing supabase/setup-all.sql')
    process.exit(1)
  }

  const sql = fs.readFileSync(sqlPath, 'utf8')
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  })

  console.log('\nConnecting to Supabase PostgreSQL...')
  await client.connect()
  console.log('Running setup-all.sql (this may take 30 seconds)...\n')

  try {
    await client.query(sql)
    console.log('✓ Database setup complete!')
    console.log('  Next: cd backend && npm run check:db')
    console.log('  Then log in at http://localhost:5173\n')
  } catch (err) {
    console.error('Setup failed:', err.message)
    if (err.message.includes('already exists')) {
      console.error('\nSome objects already exist. Try logging in and click "Check again" on the setup page.')
    }
    process.exit(1)
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
