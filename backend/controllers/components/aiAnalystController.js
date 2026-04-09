import { GoogleGenerativeAI } from "@google/generative-ai";
import db from '../../config/db.js'; 
import { DATABASE_KNOWLEDGE, APP_INFO } from '../../utils/aiKnowledgeBase.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- SAFEGUARD: SQL SANITIZER ---
const isQuerySafe = (sql) => {
    if (!sql) return true;
    const forbidden = [/insert/i, /update/i, /delete/i, /drop/i, /truncate/i, /alter/i, /create/i, /grant/i];
    const isSelect = sql.trim().toLowerCase().startsWith('select');
    return isSelect && !forbidden.some(regex => regex.test(sql));
};

export const handleAIAnalysis = async (req, res) => {
    const { question } = req.body;

    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview",
            systemInstruction: `You are the TRUST AI Analyst. 
            DATABASE SCHEMA: ${DATABASE_KNOWLEDGE}
            APP CONTEXT: ${APP_INFO}
            
            STRICT SECURITY RULES:
            1. ONLY generate SELECT queries for data questions. 
            2. NEVER generate INSERT, UPDATE, DELETE, or DROP.
            3. If a user asks to modify data, return {"answer": "Unauthorized: I cannot modify data.", "query": null}.
            4. Always use LIMIT 100.
            5. Return ONLY a JSON object: { "answer": "internal thought", "query": "sql or null" }
            6. IMPORTANT: Apply user role-based site filtering - only query data from user's allotted sites if not Administrator.`
        });

        const result = await model.generateContent(question);
        const rawText = result.response.text();
        
        // Robust JSON Extraction
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const responseData = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);

        let dbData = null;
        let sqlUsed = responseData.query;

        // Execute Query with Safeguards
        if (sqlUsed) {
            if (!isQuerySafe(sqlUsed)) {
                return res.status(403).json({ 
                    answer: "Security Block: This action is prohibited.", 
                    sql: sqlUsed 
                });
            }
            const dbResult = await db.query(sqlUsed);
            dbData = dbResult.rows;
        }

        // Pass 2: Summarize actual data for the user
        let finalAnswer = responseData.answer;
        if (dbData) {
            const summaryModel = genAI.getGenerativeModel({ 
                model: "gemini-3-flash-preview",
                systemInstruction: "Summarize the database results for the user. Be concise, use the actual numbers provided, and stay professional. If no data was found, explain that clearly."
            });
            
            const summaryResult = await summaryModel.generateContent(
                `Question: ${question}\nData: ${JSON.stringify(dbData)}\nSummary:`
            );
            finalAnswer = summaryResult.response.text();
        }

        res.json({
            answer: finalAnswer,
            data: dbData,
            sql: sqlUsed
        });

    } catch (error) {
        console.error("AI Analyst Error:", error);
        res.status(500).json({ error: "Analysis failed. Please try a different question." });
    }
};