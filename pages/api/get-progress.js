import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const { user } = req; // Assumindo que você tem a autenticação configurada
        const { data, error } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user.id);

        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json(data);
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
