const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
  // Handle CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const spells = JSON.parse(event.body);
    console.log('Received spells:', spells.length);

    // Get database URL
    let dbUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    
    if (!dbUrl) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          fallback: true,
          message: 'No database, use local storage',
          count: spells.length
        })
      };
    }

    // Clean URL
    if (dbUrl.startsWith("psql '")) {
      dbUrl = dbUrl.replace(/^psql '/, '').replace(/'$/, '');
    }

    const sql = neon(dbUrl);
    
    // Test connection and create table
    await sql`SELECT 1`;
    await sql`
      CREATE TABLE IF NOT EXISTS netlify_spells (
        id SERIAL PRIMARY KEY,
        name TEXT,
        class_name TEXT,
        level INTEGER DEFAULT 0,
        description TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Clear and insert
    await sql`DELETE FROM netlify_spells`;
    
    for (const spell of spells) {
      await sql`
        INSERT INTO netlify_spells (name, class_name, level, description)
        VALUES (${spell.name || ''}, ${spell.class || ''}, ${spell.level || 0}, ${spell.description || ''})
      `;
    }

    // Return spells in expected format
    const result = spells.map((spell, index) => ({
      id: index + 1,
      name: spell.name || '',
      class: spell.class || '',
      level: spell.level || 0,
      description: spell.description || '',
      type: spell.type || '',
      concentration: spell.concentration || false,
      upcast: spell.upcast || '',
      range: spell.range || '',
      favorite: false
    }));

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        fallback: true,
        message: 'Database error, use local storage',
        error: error.message
      })
    };
  }
};