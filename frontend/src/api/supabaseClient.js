import { createClient } from '@supabase/supabase-js';

// Fallback to empty strings to avoid crashes, actual values should be set in .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Inserts a classified risk into Supabase 'classified_risks' table.
 */
export const insertClassifiedRisks = async (projectId, risks) => {
    const records = risks.map(risk => ({
        project_id: projectId,
        risk_name: risk.rule || risk.riskName || 'Unknown Risk',
        score: risk.score || 0,
        severity: risk.severity || 'Low',
        summary: risk.summary || risk.description || '',
        // Supabase will default created_at, but we can pass timestamp if needed
    }));

    const { data, error } = await supabase
        .from('classified_risks')
        .insert(records);

    if (error) {
        console.error("Supabase insert error:", error);
        throw error;
    }
    return data;
};
