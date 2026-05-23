const fetch = require('node-fetch');

exports.handler = async (event) => {
    // تحديد رؤوس CORS للسماح لموقعك بالتواصل مع هذه الوظيفة
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };

    // التعامل مع طلب preflight من المتصفح
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }

    // الحصول على رابط Terabox من معاملات الطلب
    const shareUrl = event.queryStringParameters.url;
    if (!shareUrl) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: 'Missing Terabox URL' })
        };
    }

    // جلب الكوكيز من متغيرات البيئة في Netlify
    const userCookie = process.env.TERABOX_COOKIE;
    if (!userCookie) {
        console.error('TERABOX_COOKIE environment variable is not set');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, error: 'Server configuration error: missing cookie' })
        };
    }

    try {
        // استخراج معرف المشاركة (surl) من الرابط
        let surl = null;
        const surlMatch = shareUrl.match(/[?&]surl=([a-zA-Z0-9_-]+)/);
        if (surlMatch) {
            surl = surlMatch[1];
        } else {
            const pathMatch = shareUrl.match(/\/s\/1?([a-zA-Z0-9_-]+)/);
            if (pathMatch) surl = pathMatch[1];
        }
        
        if (!surl) {
            throw new Error('Could not extract surl from URL');
        }

        console.log(`Fetching Terabox page for surl: ${surl}`);

        // طلب صفحة المشاركة باستخدام الكوكيز الخاص بك
        const pageUrl = `https://www.terabox.com/sharing/link?surl=${surl}`;
        const pageRes = await fetch(pageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Cookie': userCookie,
                'Accept': 'text/html,application/xhtml+xml',
            }
        });

        const html = await pageRes.text();
        
        // البحث عن بيانات الفيديو داخل الصفحة
        // الطريقة الأولى: البحث عن window.pageData
        let pageData = null;
        const pageDataMatch = html.match(/window\.pageData\s*=\s*({.*?});/s);
        if (pageDataMatch) {
            try {
                pageData = JSON.parse(pageDataMatch[1]);
            } catch(e) {
                console.error('Failed to parse pageData');
            }
        }

        // الطريقة الثانية: البحث عن yunData (تنسيق آخر)
        let yunData = null;
        const yunDataMatch = html.match(/window\.yunData\s*=\s*({.*?});/s);
        if (yunDataMatch) {
            try {
                yunData = JSON.parse(yunDataMatch[1]);
            } catch(e) {}
        }

        // استخراج رابط التحميل المباشر (dlink)
        let dlink = null;
        let fileName = null;

        if (pageData && pageData.list && pageData.list.length > 0) {
            dlink = pageData.list[0].dlink;
            fileName = pageData.list[0].server_filename;
        } else if (yunData && yunData.list && yunData.list.length > 0) {
            dlink = yunData.list[0].dlink;
            fileName = yunData.list[0].server_filename;
        }

        // محاولة بديلة: البحث في النص عن dlink
        if (!dlink) {
            const dlinkMatch = html.match(/dlink["']?\s*:\s*["']([^"']+)["']/);
            if (dlinkMatch) dlink = dlinkMatch[1];
        }

        if (!dlink) {
            throw new Error('Could not extract direct download link from page');
        }

        console.log(`Found dlink, fetching final URL...`);

        // متابعة إعادة التوجيه للحصول على الرابط النهائي للفيديو
        const linkRes = await fetch(dlink, {
            method: 'HEAD',
            redirect: 'manual',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        let finalUrl = dlink;
        if (linkRes.status === 301 || linkRes.status === 302) {
            finalUrl = linkRes.headers.get('location');
        } else {
            // إذا لم يعد توجيه، قد يكون الرابط مباشراً أو يحتاج طلب GET
            const getRes = await fetch(dlink, {
                method: 'GET',
                redirect: 'follow',
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            finalUrl = getRes.url;
        }

        console.log(`Final URL obtained: ${finalUrl.substring(0, 100)}...`);

        // إعادة الرابط النهائي للواجهة الأمامية
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                streaming_url: finalUrl,
                file_name: fileName
            })
        };

    } catch (err) {
        console.error('Terabox proxy error:', err.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: err.message
            })
        };
    }
};
