import { neon } from '@netlify/neon';

// Try multiple possible environment variable names
const getDatabaseUrl = () => {
  return process.env.NETLIFY_DATABASE_URL || 
         process.env.DATABASE_URL || 
         process.env.NEON_DATABASE_URL;
};

const sql = neon(getDatabaseUrl());

export default async (req, context) => {
  const method = req.method;
  const url = new URL(req.url);
  
  try {
    switch (method) {
      case 'GET':
        const ringSpells = await sql`
          SELECT rs.id, rs.spell_id as "spellId", rs.upcast_level as "upcastLevel", 
                 rs.added_at as "addedAt", s.*
          FROM ring_storage rs
          JOIN spells s ON rs.spell_id = s.id
          ORDER BY rs.added_at DESC
        `;
        
        // Transform to match expected format
        const formattedRing = ringSpells.map(row => ({
          id: row.id,
          spellId: row.spellId,
          upcastLevel: row.upcastLevel,
          addedAt: row.addedAt,
          spell: {
            id: row.id,
            name: row.name,
            class: row.class,
            level: row.level,
            type: row.type,
            concentration: row.concentration,
            upcast: row.upcast,
            range: row.range,
            description: row.description,
            favorite: row.favorite
          }
        }));
        
        return new Response(JSON.stringify(formattedRing), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      case 'POST':
        const { spellId, upcastLevel = 0 } = await req.json();
        
        const [newRingItem] = await sql`
          INSERT INTO ring_storage (spell_id, upcast_level)
          VALUES (${spellId}, ${upcastLevel})
          RETURNING *
        `;
        
        return new Response(JSON.stringify(newRingItem), {
          status: 201,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      case 'DELETE':
        // Handle clear endpoint
        if (url.pathname.includes('/clear') || url.searchParams.get('action') === 'clear') {
          await sql`DELETE FROM ring_storage`;
          return new Response(JSON.stringify({ message: 'Ring cleared' }), {
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const ringId = url.searchParams.get('id');
        await sql`DELETE FROM ring_storage WHERE id = ${ringId}`;
        
        return new Response(JSON.stringify({ message: 'Spell removed from ring' }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        
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