export default async (req, context) => {
  return new Response(JSON.stringify({
    message: "Netlify functions are working!",
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
};