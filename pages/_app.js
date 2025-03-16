import '../styles/globals.css';
import { createBrowserClient } from '@supabase/ssr';
import { useState } from 'react';
import { SessionContextProvider } from '@supabase/auth-helpers-react';

function MyApp({ Component, pageProps }) {
  const [supabaseClient] = useState(() => 
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  );

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      <Component {...pageProps} />
    </SessionContextProvider>
  );
}

export default MyApp; 