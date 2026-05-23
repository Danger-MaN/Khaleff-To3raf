const fetch = require('node-fetch');

exports.handler = async (event) => {
    // رؤوس CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }

    // الحصول على رابط الفيديو الحقيقي
    const videoUrl = event.queryStringParameters.url;
    if (!videoUrl) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing video URL' })
        };
    }

    try {
        // جلب الفيديو من المصدر الأصلي
        const response = await fetch(videoUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch video: ${response.status}`);
        }

        // الحصول على نوع المحتوى من الاستجابة الأصلية
        const contentType = response.headers.get('content-type') || 'video/mp4';
        
        // رؤوس إضافية لتشغيل الفيديو مباشرة في المتصفح
        const videoHeaders = {
            ...headers,
            'Content-Type': contentType,
            'Content-Disposition': 'inline', // يجبر المتصفح على العرض بدلاً من التحميل
            'Cache-Control': 'public, max-age=3600',
            'Accept-Ranges': 'bytes',
        };

        // إعادة الفيديو كتيار بيانات
        return {
            statusCode: 200,
            headers: videoHeaders,
            body: response.body,
            isBase64Encoded: false,
        };

    } catch (err) {
        console.error('Stream error:', err.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: err.message })
        };
    }
};
