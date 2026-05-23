const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // 1. ضبط الرؤوس الأساسية و CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // 2. التعامل مع طلبات OPTIONS (pre-flight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  // 3. الحصول على معاملات الطلب
  const params = event.queryStringParameters;
  const videoUrlOrId = params?.url;
  const isDirectRequest = params?.direct === '1';

  // 4. التحقق من وجود رابط أو معرف الفيديو
  if (!videoUrlOrId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing video URL or ID' }),
    };
  }

  // 5. الحصول على بيانات API المحمية من متغيرات البيئة
  const apiLogin = process.env.STREAMTAPE_API_LOGIN;
  const apiKey = process.env.STREAMTAPE_API_KEY;

  if (!apiLogin || !apiKey) {
    console.error('Streamtape API credentials are not set in environment variables.');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

  try {
    // 6. استخراج معرف الفيديو (File ID)
    let fileId = null;
    // إذا كان المُدخل رابطاً كاملاً، نستخرج الـ ID منه
    if (videoUrlOrId.includes('streamtape.com/v/')) {
      const match = videoUrlOrId.match(/streamtape\.com\/v\/([a-zA-Z0-9]+)/);
      if (match && match[1]) fileId = match[1];
    } else {
      // إذا كان المُدخل هو الـ ID مباشرة
      fileId = videoUrlOrId;
    }

    if (!fileId) {
      throw new Error('Invalid Streamtape URL or ID. Could not extract file ID.');
    }

    console.log(`Processing Streamtape file ID: ${fileId}`);

    // 7. الخطوة الأولى من API: الحصول على تذكرة التحميل (Download Ticket)
    const ticketUrl = `https://api.streamtape.com/file/dlticket?file=${fileId}&login=${apiLogin}&key=${apiKey}`;
    const ticketResponse = await fetch(ticketUrl);
    const ticketData = await ticketResponse.json();

    if (ticketData.status !== 200 || !ticketData.result || !ticketData.result.ticket) {
      console.error('Failed to get download ticket:', ticketData);
      throw new Error(ticketData.msg || 'Failed to obtain download ticket');
    }

    const { ticket, wait_time = 0 } = ticketData.result;
    console.log(`Download ticket obtained. Wait time: ${wait_time} seconds.`);

    // 8. الخطوة الثانية من API: الحصول على رابط التحميل المباشر
    // إذا كان هناك وقت انتظار (wait_time)، ننتظر قليلاً قبل طلب الرابط
    if (wait_time > 0) {
      console.log(`Waiting for ${wait_time} seconds as instructed by API...`);
      await new Promise(resolve => setTimeout(resolve, wait_time * 1000));
    }

    const downloadUrl = `https://api.streamtape.com/file/dl?file=${fileId}&ticket=${ticket}`;
    const downloadResponse = await fetch(downloadUrl);
    const downloadData = await downloadResponse.json();

    if (downloadData.status !== 200 || !downloadData.result || !downloadData.result.url) {
      console.error('Failed to get download link:', downloadData);
      throw new Error(downloadData.msg || 'Failed to obtain download link');
    }

    const directVideoUrl = downloadData.result.url;
    console.log(`Direct video URL obtained.`);

    // 9. التعامل مع الطلب بناءً على نوعه
    // إذا كان طلبًا مباشرًا للفيديو (direct=1)، نقوم بتوسيطه
    if (isDirectRequest) {
      console.log(`Proxying video from ${directVideoUrl}`);
      const videoResponse = await fetch(directVideoUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video: ${videoResponse.status}`);
      }

      const videoBuffer = await videoResponse.buffer();
      console.log(`Video fetched successfully. Size: ${videoBuffer.length} bytes`);

      // نعيد الفيديو مع الرؤوس الصحيحة
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': videoResponse.headers.get('content-type') || 'video/mp4',
          'Content-Disposition': 'inline',
        },
        body: videoBuffer.toString('base64'),
        isBase64Encoded: true,
      };
    } else {
      // إذا كان طلب معلومات (بدون direct=1)، نعيد الرابط المباشر
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, direct_url: directVideoUrl }),
      };
    }
  } catch (error) {
    console.error('Streamtape function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};
