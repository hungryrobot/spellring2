import { neon } from '@netlify/neon';

export default async (req, context) => {
  try {
    // Test database connection
    const sql = neon();
    await sql`SELECT 1 as test`;
    
    return new Response(JSON.stringify({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString() 
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      status: 'ok', 
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString() 
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};