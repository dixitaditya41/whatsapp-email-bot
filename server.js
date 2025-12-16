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
    try{
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
    }
    catch(error){
        console.error("Failed to start server", error);
    }     
})


