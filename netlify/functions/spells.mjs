import { neon } from '@netlify/neon';

// Try multiple possible environment variable names
const getDatabaseUrl = () => {
  return process.env.NETLIFY_DATABASE_URL || 
         process.env.DATABASE_URL || 
         process.env.NEON_DATABASE_URL;
};

const sql = neon(getDatabaseUrl());

// Ensure tables exist
async function ensureTables() {
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
  
  await sql`
    CREATE TABLE IF NOT EXISTS ring_storage (
      id SERIAL PRIMARY KEY,
      spell_id INTEGER REFERENCES spells(id) ON DELETE CASCADE,
      upcast_level INTEGER DEFAULT 0,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
}

export default async (req, context) => {
  try {
    await ensureTables();
  } catch (error) {
    console.error('Database connection error:', error);
    return new Response(JSON.stringify({ 
      error: 'Database connection failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  
  const method = req.method;
  const url = new URL(req.url);
  
  try {
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
        const spellData = await req.json();
        
        // Handle bulk insert
        if (Array.isArray(spellData)) {
          const insertedSpells = [];
          for (const spell of spellData) {
            const [newSpell] = await sql`
              INSERT INTO spells (name, class, level, type, concentration, upcast, range, description)
              VALUES (${spell.name}, ${spell.class}, ${spell.level}, ${spell.type || ''}, 
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
        
        // Handle single insert
        const [newSpell] = await sql`
          INSERT INTO spells (name, class, level, type, concentration, upcast, range, description)
          VALUES (${spellData.name}, ${spellData.class}, ${spellData.level}, 
                 ${spellData.type || ''}, ${spellData.concentration || false}, 
                 ${spellData.upcast || ''}, ${spellData.range || ''}, 
                 ${spellData.description || ''})
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
        // Handle clear endpoint
        if (url.pathname.includes('/clear') || url.searchParams.get('action') === 'clear') {
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};