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

        // Google Drive API 認証
        const auth = new google.auth.GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS),
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        const drive = google.drive({ version: 'v3', auth });

        // アップロードされたファイルを解析
        const boundary = event.headers['content-type'].split('boundary=')[1];
        const body = Buffer.from(event.body, 'base64').toString('utf8');
        const parts = body.split(`--${boundary}`);
        const filePart = parts.find(part => part.includes('Content-Disposition'));

        const fileContent = filePart.split('\r\n\r\n')[1];
        const fileName = filePart.match(/filename="(.+?)"/)[1];

        // Google Drive にアップロード
        const fileMetadata = {
            name: fileName,
            parents: ['15FiZVLx6y5sRftCe8a4pM9go8EP-a_wT'], // Google DriveフォルダID
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

        return {
            statusCode: 200,
            body: JSON.stringify({ id: file.data.id, name: file.data.name }),
        };
    } catch (error) {
        console.error('エラー:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};

