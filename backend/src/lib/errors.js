function friendlySupabaseError(message) {
  const msg = message || ''
  if (msg.includes('Invalid API key')) {
    return (
      'Invalid Supabase secret key. Update SUPABASE_SERVICE_ROLE_KEY in backend/.env ' +
      'with the secret key from Dashboard → Project Settings → API (new project).'
    )
  }
  if (
    msg.includes('fetch failed') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('getaddrinfo') ||
    msg.includes('ERR_NAME_NOT_RESOLVED')
  ) {
    return (
      'Cannot reach Supabase. Check your internet, then verify SUPABASE_URL in backend/.env ' +
      '(Dashboard → Project Settings → API → Project URL). ' +
      'Expected: https://wbvzyxkacxthxmcdmtoe.supabase.co'
    )
  }
  if (msg.includes('Invalid login credentials')) {
    return 'Wrong email or password. If you have not registered yet, use Register first.'
  }
  return msg
}

module.exports = { friendlySupabaseError }
