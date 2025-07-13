import { neon } from '@netlify/neon';

const sql = neon(); // automatically uses env NETLIFY_DATABASE_URL

export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    const url = new URL(req.url);
    const spellId = url.searchParams.get('id');
    
    await sql`
      UPDATE spells 
      SET favorite = NOT favorite 
      WHERE id = ${spellId}
    `;
    
    return new Response(JSON.stringify({ message: 'Favorite toggled' }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};