import express from "express";
import { login_handle, register_handle , resteusername , restepassword , creatRoom, joinRoom, handleStartGame, handleSaveUserAnswer} from "../controllers/auth.controller";
import { tokenMiddleWare } from "../middlewares/verifyToken";

const router = express.Router();


router.post("/register", register_handle);
router.post("/login", login_handle);


router.post("/reset-username", resteusername);
router.post("/reset-password", restepassword);


router.post("/creatRoom", tokenMiddleWare, creatRoom);
router.post("/joinRoom", tokenMiddleWare ,joinRoom)


router.post("/start-game", handleStartGame);
router.post("/save-answer", handleSaveUserAnswer);

export default router;