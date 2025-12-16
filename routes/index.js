import express from "express";
import googleRoutes from "./google.js";
import whatsappRoutes from "./whatsapp.js";


const router = express.Router();

router.use("/google", googleRoutes);
router.use("/whatsapp", whatsappRoutes);


export default router;