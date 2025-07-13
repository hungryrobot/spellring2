export default async (req, context) => {
  // Handle CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Import neon only when needed
    const { neon } = await import('@neondatabase/serverless');
    
    // Get database URL
    let dbUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    
    // Clean URL if needed
    if (dbUrl && dbUrl.startsWith("psql '")) {
      dbUrl = dbUrl.replace(/^psql '/, '').replace(/'$/, '');
    }

    if (!dbUrl) {
      return new Response(JSON.stringify({ 
        error: 'Database not configured',
        fallback: 'using_local_storage'
      }), { status: 200, headers: corsHeaders });
    }

    const sql = neon(dbUrl);
    
    // Simple table creation
    await sql`
      CREATE TABLE IF NOT EXISTS app_spells (
        id SERIAL PRIMARY KEY,
        name TEXT,
        classes TEXT,
        level INTEGER DEFAULT 0,
        description TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    if (req.method === 'GET') {
      const spells = await sql`SELECT id, name, classes as class, level, description, false as favorite FROM app_spells ORDER BY name`;
      return new Response(JSON.stringify(spells), { headers: corsHeaders });
    }

    if (req.method === 'POST') {
      const spells = await req.json();
      
      // Clear and insert
      await sql`DELETE FROM app_spells`;
      
      const results = [];
      for (const spell of spells) {
        const [result] = await sql`
          INSERT INTO app_spells (name, classes, level, description)
          VALUES (${spell.name}, ${spell.class}, ${spell.level || 0}, ${spell.description || ''})
          RETURNING id, name, classes as class, level, description
        `;
        results.push({ ...result, favorite: false });
      }
      
      return new Response(JSON.stringify(results), { 
        status: 201, 
        headers: corsHeaders 
      });
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM app_spells`;
      return new Response(JSON.stringify({ message: 'Cleared' }), { headers: corsHeaders });
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ 
      error: 'Function failed',
      message: error.message,
      fallback: 'using_local_storage'
    }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
};