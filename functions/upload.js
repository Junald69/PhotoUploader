const { google } = require('googleapis');
const { Readable } = require('stream');

exports.handler = async (event, context) => {
    try {
        if (event.httpMethod !== 'POST') {
            return {
                statusCode: 405,
                body: 'Method Not Allowed',
            };
        }

        console.log('リクエストを受信しました:', event);

        // Google Drive API 認証
        const auth = new google.auth.GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS),
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        console.log('Google Drive 認証成功');

        const drive = google.drive({ version: 'v3', auth });

        // アップロードされたファイルを解析
        const boundary = event.headers['content-type'].split('boundary=')[1];
        const body = Buffer.from(event.body, 'base64').toString('utf8');
        const parts = body.split(`--${boundary}`);
        const filePart = parts.find(part => part.includes('Content-Disposition'));

        console.log('アップロードされたファイル解析成功');

        const fileContent = filePart.split('\r\n\r\n')[1];
        const fileName = filePart.match(/filename="(.+?)"/)[1];

        console.log(`ファイル名: ${fileName}`);

        // Google Drive にアップロード
        const fileMetadata = {
            name: fileName,
            parents: ['15FiZVLx6y5sRftCe8a4pM9go8EP-a_wT'], // フォルダIDを設定
        };

        const media = {
            mimeType: 'application/octet-stream',
            body: Readable.from(fileContent),
        };

        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, name',
        });

        console.log('アップロード成功:', file.data);

        return {
            statusCode: 200,
            body: JSON.stringify({ id: file.data.id, name: file.data.name }),
        };
    } catch (error) {
        console.error('エラーが発生しました:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};

