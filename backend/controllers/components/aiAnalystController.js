import { GoogleGenerativeAI } from "@google/generative-ai";
import db from '../../config/db.js'; 
import { DATABASE_KNOWLEDGE, APP_INFO } from '../../utils/aiKnowledgeBase.js';

// --- SAFEGUARD: SQL SANITIZER ---
const isQuerySafe = (sql) => {
    if (!sql) return true;
    const forbidden = [/insert/i, /update/i, /delete/i, /drop/i, /truncate/i, /alter/i, /create/i, /grant/i];
    const isSelect = sql.trim().toLowerCase().startsWith('select');
    return isSelect && !forbidden.some(regex => regex.test(sql));
};

// Normalize mixed-case PostgreSQL identifiers (ensures mixed-case columns are quoted)
const normalizeMixedCaseSQL = (sql) => {
    if (!sql) return sql;
    const mixedCaseIdentifiers = [
        'LAB_ObservationID',
        'ObservationType_ID',
        'ObservationTypeID',
        'LOINCCode',
        'Observation_Date',
        'PatientID',
        'LabOrderID',
        'OrderedBy',
        'StatusID',
        'OrderDate',
        'AppointmentID',
        'StartDateTime',
        'VisitType',
        'CarePlanID',
        'ActivityID',
        'ActivityType_ID',
        'PlanStatus_ID',
        'AlertID',
        'AlertTypeID',
        'GeneratedDate',
        'ResolvedFlag',
        'RoleID',
        'Role_Name',
        'HospitalTypeID',
        'TypeName',
        'LevelName'
    ];

    let fixedSql = sql;
    for (const id of mixedCaseIdentifiers) {
        const regex = new RegExp(`(?<!["\\w])\\b${id}\\b(?!["\\w])`, 'gi');
        fixedSql = fixedSql.replace(regex, `"${id}"`);
    }

    fixedSql = fixedSql.replace(/(?<!["\w])\bValue\b(?!["\w])/gi, (match, offset, str) => {
        const before = str.slice(Math.max(0, offset - 10), offset).trim().toUpperCase();
        if (before.endsWith('INSERT INTO') || before.endsWith(')')) {
            const after = str.slice(offset + 5).trim();
            if (after.startsWith('(')) return match;
        }
        return '"Value"';
    });

    return fixedSql;
};

export const handleAIAnalysis = async (req, res) => {
    const { question } = req.body;

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "Server configuration error: GEMINI_API_KEY is missing on this server." });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

        const model = genAI.getGenerativeModel({ 
            model: modelName,
            systemInstruction: `You are the TRUST AI Analyst. 
            DATABASE SCHEMA: ${DATABASE_KNOWLEDGE}
            APP CONTEXT: ${APP_INFO}
            
            STRICT SECURITY RULES:
            1. ONLY generate SELECT queries for data questions. 
            2. NEVER generate INSERT, UPDATE, DELETE, or DROP.
            3. If a user asks to modify data, return {"answer": "Unauthorized: I cannot modify data.", "query": null}.
            4. Always use LIMIT 100.
            5. Return ONLY a JSON object: { "answer": "internal thought", "query": "sql or null" }
            6. IMPORTANT: Quote mixed-case column names with double quotes: "PatientID", "Value", "Observation_Date", "LOINCCode", "OrderedBy", "OrderDate".
            7. Apply user role-based site filtering - only query data from user's allotted sites if not Administrator.`
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
            sqlUsed = normalizeMixedCaseSQL(sqlUsed);
            if (!isQuerySafe(sqlUsed)) {
                return res.status(403).json({ 
                    answer: "Security Block: This action is prohibited.", 
                    sql: sqlUsed 
                });
            }

            try {
                const dbResult = await db.query(sqlUsed);
                dbData = dbResult.rows;
            } catch (dbErr) {
                console.error("AI Analyst SQL Execution Error:", dbErr.message, "SQL:", sqlUsed);
                // Return descriptive answer without crashing
                return res.json({
                    answer: `The query could not be completed: ${dbErr.message}`,
                    data: null,
                    sql: sqlUsed
                });
            }
        }

        // Pass 2: Summarize actual data for the user
        let finalAnswer = responseData.answer;
        if (dbData) {
            const summaryModel = genAI.getGenerativeModel({ 
                model: modelName,
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
        res.status(500).json({ error: "Analysis failed: " + error.message });
    }
};