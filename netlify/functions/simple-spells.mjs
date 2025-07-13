import { neon } from '@neondatabase/serverless';

export default async (req, context) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  try {
    // Get database URL and clean it
    let dbUrl = process.env.DATABASE_URL || 
                process.env.NETLIFY_DATABASE_URL || 
                process.env.NEON_DATABASE_URL;
    
    // Clean the URL if it has psql prefix
    if (dbUrl && dbUrl.startsWith("psql '")) {
      dbUrl = dbUrl.replace(/^psql '/, '').replace(/'$/, '');
    }

    if (!dbUrl) {
      return new Response(JSON.stringify({ 
        error: 'No database URL configured',
        available_vars: {
          DATABASE_URL: !!process.env.DATABASE_URL,
          NETLIFY_DATABASE_URL: !!process.env.NETLIFY_DATABASE_URL,
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

    const sql = neon(dbUrl);
    
    // Ensure table exists
    await sql`
      CREATE TABLE IF NOT EXISTS spells (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        class TEXT NOT NULL,
        level INTEGER NOT NULL,
        type TEXT,
        concentration BOOLEAN DEFAULT FALSE,
        upcast TEXT,
        range TEXT,
        description TEXT,
        favorite BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const method = req.method;
    const url = new URL(req.url);

    switch (method) {
      case 'GET':
        const spells = await sql`SELECT * FROM spells ORDER BY name`;
        return new Response(JSON.stringify(spells), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });

      case 'POST':
        const body = await req.json();
        
        // Handle array of spells (bulk insert)
        if (Array.isArray(body)) {
          const insertedSpells = [];
          for (const spell of body) {
            const [newSpell] = await sql`
              INSERT INTO spells (name, class, level, type, concentration, upcast, range, description)
              VALUES (${spell.name}, ${spell.class}, ${spell.level || 0}, ${spell.type || ''}, 
                     ${spell.concentration || false}, ${spell.upcast || ''}, 
                     ${spell.range || ''}, ${spell.description || ''})
              RETURNING *
            `;
            insertedSpells.push(newSpell);
          }
          return new Response(JSON.stringify(insertedSpells), {
            status: 201,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }

        // Handle single spell
        const [newSpell] = await sql`
          INSERT INTO spells (name, class, level, type, concentration, upcast, range, description)
          VALUES (${body.name}, ${body.class}, ${body.level || 0}, ${body.type || ''}, 
                 ${body.concentration || false}, ${body.upcast || ''}, 
                 ${body.range || ''}, ${body.description || ''})
          RETURNING *
        `;
        
        return new Response(JSON.stringify(newSpell), {
          status: 201,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });

      case 'DELETE':
        if (url.searchParams.get('action') === 'clear') {
          await sql`DELETE FROM spells`;
          return new Response(JSON.stringify({ message: 'All spells cleared' }), {
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        return new Response('Not found', { status: 404 });

      default:
        return new Response('Method not allowed', { status: 405 });
    }

  } catch (error) {
    console.error('Database error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};