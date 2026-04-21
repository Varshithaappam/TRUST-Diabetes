// src/components/AIAnalyst.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, Send, Loader2, AlertCircle, Clock } from 'lucide-react';

const AIAnalyst = ({ globalFilters }) => {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [cooldown, setCooldown] = useState(0);

    // Countdown timer for rate limiting
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const suggestions = [
        "How many patients are Uncontrolled?",
        "What is the average HbA1c for male patients?",
        "List the top 3 sites with the most patients"
    ];

    const handleAsk = async (textToAsk = query) => {
        if (!textToAsk || cooldown > 0) return;
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await axios.post('/api/ai/query', { 
                question: textToAsk,
                activeFilters: globalFilters 
            });
            setResult(res.data.answer);
        } catch (err) {
            const errorMsg = err.response?.data?.error || "An unexpected error occurred.";
            setError(errorMsg);
            // Check if rate limited and start countdown
            if (err.response?.status === 429) {
                const retryAfter = err.response?.data?.retryAfter || 20;
                setCooldown(retryAfter);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <header>
                <h2 className="text-2xl font-bold flex items-center gap-2 font-anvier uppercase">
                    <Sparkles className="text-blue-600" /> AI Analyst
                </h2>
                <p className="text-slate-500 font-electronic-regular">Ask natural language questions about the filtered patient cohort.</p>
            </header>

            {/* Suggestions Section */}
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 font-electronic-bold">Suggested Queries</p>
                <div className="flex flex-wrap gap-2">
                    {suggestions.map(s => (
                        <button 
                            key={s}
                            onClick={() => { setQuery(s); handleAsk(s); }}
                            className="px-4 py-2 border border-slate-200 rounded-full text-sm hover:bg-blue-50 hover:border-blue-200 transition"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Result Display */}
            {(result || error) && (
                <div className={`p-6 rounded-2xl border ${error ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
                    <div className={`flex items-center gap-2 mb-2 font-semibold ${error ? 'text-red-600' : 'text-blue-600'}`}>
                        {error ? <AlertCircle size={18} /> : <Sparkles size={18} />}
                        {error ? (cooldown > 0 ? 'Rate Limited' : 'Error') : 'Analysis Result'}
                    </div>
                    <p className="text-slate-800 leading-relaxed font-electronic-regular">{result || error}</p>
                    {cooldown > 0 && (
                        <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                            <Clock size={12} /> Please wait {cooldown} seconds before trying again
                        </p>
                    )}
                </div>
            )}

            {/* Input Bar */}
            <div className="relative">
                <textarea
                    className="w-full p-5 pr-14 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none resize-none shadow-sm"
                    placeholder="Ask a question about the data..."
                    rows="3"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button 
                    onClick={() => handleAsk()}
                    disabled={loading || cooldown > 0}
                    className="absolute bottom-4 right-4 p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-300 transition shadow-md"
                >
                    {cooldown > 0 ? <Clock size={20} className="animate-pulse" /> : loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                </button>
            </div>
        </div>
    );
};

export default AIAnalyst;
