import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db/config.js';
import routes from './routes/index.js';


const app = express();

dotenv.config();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.send('Whatsapp Email Bot is running...');
});

// Test endpoint to verify webhook configuration
app.get('/whatsapp/test-webhook', (req, res) => {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    res.json({
        status: 'Webhook Configuration Test',
        webhookUrl: `${req.protocol}://${req.get('host')}/whatsapp/webhook`,
        verifyTokenSet: !!verifyToken,
        verifyTokenPreview: verifyToken ? verifyToken.substring(0, 4) + '...' + verifyToken.slice(-4) : 'NOT SET',
        instructions: [
            '1. Go to Meta for Developers → WhatsApp → Configuration → Webhooks',
            '2. Set Callback URL to: ' + `${req.protocol}://${req.get('host')}/whatsapp/webhook`,
            '3. Set Verify token to match your WHATSAPP_VERIFY_TOKEN',
            '4. Click "Verify and save"',
            '5. Check your server logs for verification status'
        ]
    });
});

// Handle incorrect webhook path (common mistake)
app.get('/webhook', (req, res) => {
    console.log('⚠️  Request received at /webhook (incorrect path)');
    console.log('The correct webhook URL is: /whatsapp/webhook');
    res.status(400).json({
        error: 'Incorrect webhook path',
        message: 'The webhook endpoint is at /whatsapp/webhook, not /webhook',
        correctUrl: `${req.protocol}://${req.get('host')}/whatsapp/webhook`
    });
});

app.use(routes);

connectDB().then(() => {
    try {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Webhook URL should be configured as: <YOUR_DOMAIN>/whatsapp/webhook`);
            console.log(`Google Redirect URI should be: <YOUR_DOMAIN>/google/callback`);

            if (!process.env.WHATSAPP_TOKEN) console.warn("⚠️  WARNING: WHATSAPP_TOKEN is missing in .env");
            if (!process.env.WHATSAPP_VERIFY_TOKEN) console.warn("⚠️  WARNING: WHATSAPP_VERIFY_TOKEN is missing in .env");
            if (!process.env.WHATSAPP_PHONE_NUMBER_ID) console.warn("⚠️  WARNING: WHATSAPP_PHONE_NUMBER_ID is missing in .env");
            if (!process.env.GOOGLE_CLIENT_ID) console.warn("⚠️  WARNING: GOOGLE_CLIENT_ID is missing in .env");
        });
    }
    catch (error) {
        console.error("Failed to start server", error);
    }
})


