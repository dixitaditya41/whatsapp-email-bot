import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const DATABASE_NAME = process.env.DATABASE_NAME;
const MONGO_URI = process.env.DATABASE_URI;

export const connectDB = async () => {
    try{
        await mongoose.connect(`${MONGO_URI}/${DATABASE_NAME}`);
        console.log("MongoDB connected successfully");
    }catch{
       console.error("MongoDB connection failed");
       process.exit(1);
    }
}