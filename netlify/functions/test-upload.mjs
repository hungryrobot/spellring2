export default async (req, context) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    
    // Log the incoming data for debugging
    console.log('Received upload request');
    console.log('Body type:', typeof body);
    console.log('Is array:', Array.isArray(body));
    console.log('Length:', body.length);
    console.log('First item:', JSON.stringify(body[0], null, 2));
    
    // Validate each spell
    const validationErrors = [];
    body.forEach((spell, index) => {
      if (!spell.name || typeof spell.name !== 'string') {
        validationErrors.push(`Spell ${index}: name is required and must be a string`);
      }
      if (!spell.class || typeof spell.class !== 'string') {
        validationErrors.push(`Spell ${index}: class is required and must be a string`);
      }
      if (spell.level !== undefined && (typeof spell.level !== 'number' || isNaN(spell.level))) {
        validationErrors.push(`Spell ${index}: level must be a number`);
      }
      if (spell.concentration !== undefined && typeof spell.concentration !== 'boolean') {
        validationErrors.push(`Spell ${index}: concentration must be a boolean`);
      }
    });
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Validation test complete',
      received_count: body.length,
      validation_errors: validationErrors,
      sample_spell: body[0]
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('Test upload error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};