import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { user } = req; // Assumindo que você tem a autenticação configurada
        const { goalType, goalValue, deadline } = req.body;

        const { data, error } = await supabase
            .from('user_goals')
            .insert([
                { user_id: user.id, goal_type: goalType, goal_value: goalValue, deadline: deadline }
            ]);

        if (error) return res.status(400).json({ error: error.message });
        return res.status(201).json(data);
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
