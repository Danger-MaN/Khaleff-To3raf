exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  try {
    const { password } = JSON.parse(event.body);
    const isValid = password === process.env.ADMIN_PASSWORD;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ isValid })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ isValid: false, error: error.message })
    };
  }
};
