export const getToken = () => {
  console.log('[getToken] 🔑 Retrieving token');
  try {
    const localToken = localStorage.getItem('jwt');
    const cookieToken = document.cookie
      .split('; ')
      .find((row) => row.startsWith('jwt='))
      ?.split('=')[1];

    const token = localToken || cookieToken || null;

    console.log('[getToken] Token check:', {
      source: localToken ? 'localStorage' : cookieToken ? 'cookie' : 'none',
      localToken: localToken ? localToken.slice(0, 20) + '...' : 'missing',
      cookieToken: cookieToken ? cookieToken.slice(0, 20) + '...' : 'missing',
      finalToken: token ? token.slice(0, 20) + '...' : 'null',
    });

    return token;
  } catch (err) {
    console.error('[getToken] ❌ Error retrieving token:', {
      error: err.message,
      stack: err.stack,
    });
    return null;
  }
};
