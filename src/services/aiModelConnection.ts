import http from 'http';
import { URL } from 'url';

interface QuestionResponse {
  question: string;
  A: string;
  B: string;
  C: string;
  D: string;
  correct_answer: string;
}

interface AIQuestion {
  question: string;
  options: string[];
  correct_answer: string;
}

const makeHttpRequest = (url: string, data: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const postData = JSON.stringify(data);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 5000,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            const jsonData = JSON.parse(responseData);
            resolve(jsonData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${responseData}`));
        }
      });
    });
    req.on('error', (error) => {
      reject(error);
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.setTimeout(30000); // 30 second timeout
    req.write(postData);
    req.end();
  });
};

export const getQuestionsFromAI = async (topic: string = "general knowledge", numberOfQuestions: number = 10): Promise<AIQuestion[]> => {
  try {
    // Flask AI service URL - adjust the host/port as needed
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5000/get_questions';
    
    console.log(`Requesting ${numberOfQuestions} questions for topic: ${topic}`);
    
    const response = await makeHttpRequest(AI_SERVICE_URL, {
      topic: topic,
      number_of_questions: numberOfQuestions
    });

    // Transform the response from Flask format to your expected format
    const questions: AIQuestion[] = response.map((q: QuestionResponse) => ({
      question: q.question,
      options: [q.A, q.B, q.C, q.D],
      correct_answer: q.correct_answer
    }));

    console.log(`Successfully received ${questions.length} questions from AI service`);
    return questions;

  } catch (error: any) {
    console.error('Error calling AI service:', error.message);
    return [];
  }
};