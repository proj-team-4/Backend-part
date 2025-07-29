import { getCorrectAnswerByQuestionId , saveAnswerToDB } from "../repositories/user.repository";

export const saveUserAnswer = async (
  userId: string,
  questionId: string,
  selectedAnswer: string
): Promise<void> => {
  const correctAnswer = await getCorrectAnswerByQuestionId(questionId);
  const isCorrect = selectedAnswer === correctAnswer;
  await saveAnswerToDB(userId, questionId, selectedAnswer, isCorrect);
};
