import { Request, Response } from "express";
import { generateToken } from "../services/generatetoken";
import { addUser, getUserById, getUserByName, updateUsername, updatePassword, getRoomByCode, checkUserInRoom, addUserToRoom } from "../repositories/user.repository";
import { isVerfied } from "../services/auth.service";
import { Server, Socket } from "socket.io";
import { AuthRequest } from "../middlewares/verifyToken";
import { createRoomGame } from "../repositories/user.repository";
import { getQuestionsFromAI } from "../services/aiModelConnection";
import { saveQuestionToRoom } from "../repositories/user.repository";
import { saveUserAnswer } from "../services/checkcorrectAnswer";
import { v4 as uuidv4 } from 'uuid';

export const login_handle = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await getUserByName(username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await isVerfied(username, password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({ id: String(user.id), username: user.username });

    return res.status(200).json({
      message: "Login successful",
      token,
      userId: user.id,
      username: user.username,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const register_handle = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const existingUser = await getUserByName(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const userId = await addUser(username, password);
    const token = generateToken({ id: userId, username });

    return res.status(201).json({
      message: "User registered successfully",
      token,
      userId,
      username,
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const resteusername = async (req: Request, res: Response) => {
  const { username, newusername, currentpassword } = req.body;
  if (!username || !newusername || !currentpassword) {
    return res.status(401).json({ error: 'all fields are required' })
  }

  try {
    const user = await getUserByName(username);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.password !== currentpassword) {
      return res.status(401).json({ error: "Incorrect old password" });
    }

    await updateUsername(user.id, newusername)
    return res.status(200).json({ message: "username updated successfully" });
  }

  catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export const restepassword = async (req: Request, res: Response) => {
  const { username, currentpassword, newpassword } = req.body;
  if (!username || !newpassword || !currentpassword) {
    return res.status(401).json({ error: 'all fields are required' })
  }

  try {
    const user = await getUserByName(username);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.password !== currentpassword) {
      return res.status(401).json({ error: "Incorrect old password" });
    }

    await updatePassword(user.id, newpassword)
    return res.status(200).json({ message: "password updated successfully" });
  }

  catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export const creatRoom = async (req: AuthRequest, res: Response) => {
  try {
    const created_by = req.user?.id;

    if (!created_by) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const [room_code, room_id] = await createRoomGame(created_by);

    res.status(200).json({ room_code, room_id, created_by });

  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const joinRoom = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_room", async ({ room_code, user_id }) => {
      try {
        if (!room_code || !user_id) {
          socket.emit("join_error", { message: "Room code and user ID are required" });
          return;
        }

        const room = await getRoomByCode(room_code);
        if (!room) {
          socket.emit("join_error", { message: "Room not found" });
          return;
        }

        const alreadyJoined = await checkUserInRoom(room.id, user_id);
        if (!alreadyJoined) {
          await addUserToRoom(user_id, room.id);
        }

        const user = await getUserById(user_id);
        const user_name = user?.username || "Anonymous";

        socket.join(room_code);

        socket.to(room_code).emit("user_joined", {
          user_id,
          user_name,
          message: `${user_name} joined the room`,
        });

        socket.emit("join_success", {
          message: alreadyJoined ? "Already in room" : "Joined room successfully",
          room_id: room.id,
          room_code,
          user_id,
          user_name,
        });

      } catch (err) {
        console.error(err);
        socket.emit("join_error", { message: "Internal server error" });
      }
    });
  });
};

export const handleStartGame = async (req: Request, res: Response) => {
  const { room_code, topic, number_of_questions } = req.body;

  console.log('🎮 START GAME REQUEST:');
  console.log('📝 Received room_code:', room_code);
  console.log('📝 Room code type:', typeof room_code);
  console.log('📝 Room code length:', room_code?.length);
  console.log('📝 Topic:', topic);
  console.log('📝 Number of questions:', number_of_questions);

  try {
    const io = req.app.get("io");

    console.log('🔍 Searching for room with code:', room_code);
    const room = await getRoomByCode(room_code);
    console.log('🏠 Room found:', room);

    if (!room) {
      console.log('❌ Room not found in database');
      return res.status(404).json({ message: "Room not found" });
    }

    console.log('✅ Room found, proceeding with game start...');

    const aiQuestions = await getQuestionsFromAI(
      topic || "general knowledge",
      number_of_questions || 10
    );
    console.log('📝 Processing questions from AI:', aiQuestions.length);
    
    // Save questions to database and get their IDs
    const questions = [];
    for (const q of aiQuestions) {
      const questionId = await saveQuestionToRoom(q.question, q.options, q.correct_answer, room.id);
      questions.push({
        id: questionId,
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer
      });
    }

    console.log('💾 Questions saved to database');

    // Prepare the game started data
    const gameStartedData = {
      message: "Game has started!",
      questions: questions,
      topic: topic || "general knowledge",
      room_code: room_code,
      room_id: room.id
    };

    // Emit game started event to all clients in the room
    console.log('📡 Emitting game_started event to room:', room_code);
    console.log('📡 Connected sockets in room:', io.sockets.adapter.rooms.get(room_code)?.size || 0);
    
    // Emit to the room
    io.to(room_code).emit("game_started", gameStartedData);
    
    // Also emit to all connected sockets as a fallback (in case room joining failed)
    console.log('📡 Broadcasting game_started as fallback');
    io.emit("game_started_broadcast", {
      ...gameStartedData,
      target_room: room_code
    });

    // Send first question
    if (questions.length > 0) {
      console.log('❓ Emitting first question');
      const firstQuestionData = {
        question: questions[0],
        index: 0,
        total_questions: questions.length
      };
      
      io.to(room_code).emit("new_question", firstQuestionData);
      io.emit("new_question_broadcast", {
        ...firstQuestionData,
        target_room: room_code
      });
    }

    console.log('✅ Game started successfully');

    return res.status(200).json({
      message: "Game started successfully",
      topic: topic || "general knowledge",
      questions_count: questions.length,
      room_code: room_code
    });
  } catch (err: any) {
    console.error("❌ Error starting game:", err);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
};

export const handleSaveUserAnswer = async (req: Request, res: Response) => {
  const { user_id, question_id, selected_answer } = req.body;

  if (!user_id || !question_id || !selected_answer) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    await saveUserAnswer(user_id, question_id, selected_answer);
    return res.status(201).json({ message: "Answer saved successfully" });
  } catch (error) {
    console.error("Error saving answer:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};