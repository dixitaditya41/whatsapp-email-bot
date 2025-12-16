import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db/config.js';
import routes from './routes/index.js';


const app = express();

dotenv.config();

// Trust proxy for accurate protocol detection (important for Render.com)
app.set('trust proxy', true);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to log all incoming requests for debugging
app.use((req, res, next) => {
  if (req.path.includes('webhook')) {
    console.log(`\n📥 Incoming ${req.method} request to ${req.path}`);
    console.log(`Raw URL: ${req.url}`);
    console.log(`Query string: ${req.url.split('?')[1] || 'none'}`);
  }
  next();
});

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.send('Whatsapp Email Bot is running...');
});

app.use(routes)

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


