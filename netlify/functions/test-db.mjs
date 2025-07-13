import { neon } from '@netlify/neon';

export default async (req, context) => {
  try {
    // Check all possible environment variable names
    const netlifyDbUrl = process.env.NETLIFY_DATABASE_URL;
    const dbUrl = process.env.DATABASE_URL;
    const neonDbUrl = process.env.NEON_DATABASE_URL;
    
    let activeDbUrl = netlifyDbUrl || dbUrl || neonDbUrl;
    
    // Clean the URL if it has psql prefix
    if (activeDbUrl && activeDbUrl.startsWith("psql '")) {
      activeDbUrl = activeDbUrl.replace(/^psql '/, '').replace(/'$/, '');
    }
    
    if (!activeDbUrl) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No database URL found',
        env_vars: {
          NETLIFY_DATABASE_URL: !!netlifyDbUrl,
          DATABASE_URL: !!dbUrl,
          NEON_DATABASE_URL: !!neonDbUrl
        }
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    const sql = neon(activeDbUrl);
    
    // Test basic connection
    const result = await sql`SELECT 1 as test`;
    
    return new Response(JSON.stringify({
      success: true,
      test_query: result,
      active_env_var: netlifyDbUrl ? 'NETLIFY_DATABASE_URL' : dbUrl ? 'DATABASE_URL' : 'NEON_DATABASE_URL',
      database_url_preview: activeDbUrl.substring(0, 30) + '...'
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      env_vars: {
        NETLIFY_DATABASE_URL: !!process.env.NETLIFY_DATABASE_URL,
        DATABASE_URL: !!process.env.DATABASE_URL,
        NEON_DATABASE_URL: !!process.env.NEON_DATABASE_URL
      }
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};