import { dataBaseConnection } from "../config/db";
import { user } from "../models/user.model";
import { v4 as uuidv4 } from 'uuid';

export const getUserById = async (id: any): Promise<user> => {
  const conn = await dataBaseConnection.getConnection();
  try {
    const [rows]: any = await conn.execute('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  } finally {
    conn.release();
  }
}

export const addUser = async (username: string, password: string): Promise<string> => {
  const id = uuidv4();
  const conn = await dataBaseConnection.getConnection();
  try {
    await conn.execute(
      'INSERT INTO users (id, username, password) VALUES (?, ?, ?)',
      [id, username, password]
    );
    return id;
  } finally {
    conn.release();
  }
};

export const getUserByName = async (username: string): Promise<any> => {
  const conn = await dataBaseConnection.getConnection();
  try {
    const [rows]: any = await conn.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return rows.length ? rows[0] : null;
  } finally {
    conn.release();
  }
};

export const updateUsername = async (id: any, username: string) => {
  const conn = await dataBaseConnection.getConnection();
  try {
    await conn.execute("UPDATE users SET username = ? WHERE id = ?", [username, id]);
  } finally {
    conn.release();
  }
}

export const updatePassword = async (id: any, password: string) => {
  const conn = await dataBaseConnection.getConnection();
  try {
    await conn.execute("UPDATE users SET password = ? WHERE id = ?", [password, id]);
  } finally {
    conn.release();
  }
}

export const createRoomGame = async (created_by: string) => {
  console.log('🚀 createRoomGame called with created_by:', created_by);
  
  const conn = await dataBaseConnection.getConnection();
  try {
    const roomId = uuidv4();
    console.log('📋 Generated room ID:', roomId);
    
    const room_code = uuidv4().slice(0, 6).toUpperCase();
    console.log('🎯 Generated room code:', room_code, 'Length:', room_code.length);
    
    const created_at = new Date();

    console.log('💾 About to insert room with code:', room_code);
    
    await conn.execute(
      'INSERT INTO rooms (id, room_code, created_by, created_at) VALUES (?, ?, ?, ?)',
      [roomId, room_code, created_by, created_at]
    );

    console.log('✅ Room inserted successfully');

    await conn.execute(
      'INSERT INTO room_players (id, room_id, user_id, joined_at, is_host) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), roomId, created_by, new Date(), 1]
    );

    console.log('✅ Host added successfully');
    console.log('🎉 Final room code being returned:', room_code);
    
    return [room_code, roomId];

  } catch (error) {
    console.error("❌ Error in createRoomGame:", error);
    throw error;
  } finally {
    conn.release(); // Critical: Always release the connection
  }
};

export const getRoomByCode = async (room_code: string): Promise<{ id: string } | null> => {
  console.log('🔍 Looking for room with code:', room_code);
  
  const conn = await dataBaseConnection.getConnection();
  try {
    const [rows]: any = await conn.execute(
      'SELECT id, room_code FROM rooms WHERE room_code = ?',
      [room_code]
    );
    
    console.log('📋 Query result:', rows);
    
    if (rows.length > 0) {
      console.log('✅ Room found');
      return { id: rows[0].id };
    } else {
      console.log('❌ Room not found');
      return null;
    }
  } catch (error) {
    console.error('Error in getRoomByCode:', error);
    return null;
  } finally {
    conn.release(); // Critical: Always release the connection
  }
};

export const checkUserInRoom = async (room_id: string, userId: string): Promise<boolean> => {
  const conn = await dataBaseConnection.getConnection();
  try {
    const [rows]: any = await conn.execute(
      'SELECT * FROM room_players WHERE user_id = ? AND room_id = ?',
      [userId, room_id]
    );
    return rows.length > 0;
  } finally {
    conn.release();
  }
}

export const addUserToRoom = async (userId: string, room_id: string): Promise<void> => {
  const joinedAt = new Date();
  const id = uuidv4();
  const conn = await dataBaseConnection.getConnection();
  try {
    await conn.execute(
      'INSERT INTO room_players (id, user_id, room_id, joined_at) VALUES (? ,?, ?, ?)',
      [id, userId, room_id, joinedAt]
    );
  } finally {
    conn.release();
  }
}

export const saveQuestionToRoom = async (
  question: string,
  options: string[],
  correct_answer: string,
  room_id: string
): Promise<void> => {
  const id = uuidv4();
  const conn = await dataBaseConnection.getConnection();
  try {
    await conn.execute(
      `INSERT INTO questions (
        id,
        question_text,
        option_1,
        option_2,
        option_3,
        option_4,
        correct_answer,
        room_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        question,
        options[0],
        options[1],
        options[2],
        options[3],
        correct_answer,
        room_id,
      ]
    );
  } finally {
    conn.release();
  }
};

export const getCorrectAnswerByQuestionId = async (questionId: string): Promise<string> => {
  const connection = await dataBaseConnection.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT correct_answer FROM questions WHERE id = ?`,
      [questionId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("Question not found");
    }

    return (rows[0] as any).correct_answer;
  } finally {
    connection.release();
  }
};

export const saveAnswerToDB = async (
  userId: string,
  questionId: string,
  selectedAnswer: string,
  isCorrect: boolean
): Promise<void> => {
  const connection = await dataBaseConnection.getConnection();
  const id = uuidv4();
  try {
    await connection.execute(
      `INSERT INTO answers (id, user_id, question_id, selected_answer, is_correct)
       VALUES (?, ?, ?, ?, ?)`,
      [id, userId, questionId, selectedAnswer, isCorrect]
    );
  } finally {
    connection.release();
  }
};