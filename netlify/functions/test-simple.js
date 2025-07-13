exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'Simple test working',
      method: event.httpMethod,
      hasDb: !!process.env.NETLIFY_DATABASE_URL
    })
  };
};