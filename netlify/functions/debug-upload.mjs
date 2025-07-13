export default async (req, context) => {
  try {
    // Log all environment variables (safely)
    const envVars = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      NETLIFY_DATABASE_URL: !!process.env.NETLIFY_DATABASE_URL,
      NEON_DATABASE_URL: !!process.env.NEON_DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      NETLIFY_DEV: process.env.NETLIFY_DEV
    };
    
    // Test request details
    const requestDetails = {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
      contentType: req.headers.get('content-type')
    };
    
    // If POST request, try to read body
    let body = null;
    if (req.method === 'POST') {
      try {
        const text = await req.text();
        body = text.substring(0, 200) + (text.length > 200 ? '...' : '');
      } catch (e) {
        body = 'Could not read body: ' + e.message;
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      environment: envVars,
      request: requestDetails,
      body: body,
      timestamp: new Date().toISOString()
    }, null, 2), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
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