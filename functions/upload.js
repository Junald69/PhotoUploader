const { google } = require('googleapis');
const { Readable } = require('stream');

exports.handler = async (event, context) => {
    try {
        console.log('関数がトリガーされました:', event);

        if (event.httpMethod !== 'POST') {
            return {
                statusCode: 405,
                body: 'Method Not Allowed',
            };
        }

        const auth = new google.auth.GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS),
            scopes: ['https://www.googleapis.com/auth/drive.file '],
        });

        const drive = google.drive({ version: 'v3', auth });

        const boundary = event.headers['content-type'].split('boundary=')[1];
        const body = Buffer.from(event.body, 'base64').toString('utf8');
        const parts = body.split(`--${boundary}`);
        const filePart = parts.find(part => part.includes('Content-Disposition'));

        if (!filePart) {
            return {
                statusCode: 400,
                body: 'ファイルが見つかりません',
            };
        }

        const fileContent = filePart.split('\r\n\r\n')[1];
        const fileName = filePart.match(/filename="(.+?)"/)[1];

        const fileMetadata = {
            name: fileName,
            parents: ['15FiZVLx6y5sRftCe8a4pM9go8EP-a_wT'],
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
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ id: file.data.id, name: file.data.name }),
        };
    } catch (error) {
        console.error('エラーが発生しました:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: error.message }),
        };
    }
};