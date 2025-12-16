import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db/config.js';
import routes from './routes/index.js';


const app = express();

dotenv.config();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.send('Whatsapp Email Bot is running...');
});

app.use(routes);

connectDB().then(() => {
    try {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Webhook URL should be configured as: <YOUR_DOMAIN>/whatsapp/webhook`);
            console.log(`Google Redirect URI should be: <YOUR_DOMAIN>/google/callback`);

            if (!process.env.WHATSAPP_TOKEN) console.warn("WARNING: WHATSAPP_TOKEN is missing in .env");
            if (!process.env.GOOGLE_CLIENT_ID) console.warn("WARNING: GOOGLE_CLIENT_ID is missing in .env");
        });
    }
    catch (error) {
        console.error("Failed to start server", error);
    }
})


