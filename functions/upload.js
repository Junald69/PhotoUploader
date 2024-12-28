const { google } = require('googleapis');
const { Readable } = require('stream');

exports.handler = async (event, context) => {
    try {
        console.log('関数がトリガーされました:', event);

        // HTTPメソッドの確認
        if (event.httpMethod !== 'POST') {
            console.log('許可されていないメソッド:', event.httpMethod);
            return {
                statusCode: 405,
                body: 'Method Not Allowed',
            };
        }

        console.log('Google Drive API 認証を開始します');
        const auth = new google.auth.GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS),
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        const drive = google.drive({ version: 'v3', auth });
        console.log('Google Drive API 認証成功');

        console.log('アップロードされたデータを解析します');
        const boundary = event.headers['content-type'].split('boundary=')[1];
        const body = Buffer.from(event.body, 'base64').toString('utf8');
        const parts = body.split(`--${boundary}`);
        const filePart = parts.find(part => part.includes('Content-Disposition'));

        if (!filePart) {
            console.error('ファイルデータが見つかりません');
            return {
                statusCode: 400,
                body: 'ファイルがアップロードされていません',
            };
        }

        const fileContent = filePart.split('\r\n\r\n')[1];
        const fileName = filePart.match(/filename="(.+?)"/)[1];
        console.log(`アップロードされたファイル名: ${fileName}`);

        const fileMetadata = {
            name: fileName,
            parents: ['15FiZVLx6y5sRftCe8a4pM9go8EP-a_wT'], // Google DriveフォルダIDをここに設定
        };

        const media = {
            mimeType: 'application/octet-stream',
            body: Readable.from(fileContent),
        };

        console.log('Google Drive にファイルをアップロードします');
        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, name',
        });

        console.log('アップロード成功:', file.data);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*', // CORS設定
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify({ id: file.data.id, name: file.data.name }),
        };
    } catch (error) {
        console.error('エラーが発生しました:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*', // CORS設定
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify({ error: error.message }),
        };
    }
};