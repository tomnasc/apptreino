import React from 'react';
import Layout from '../components/Layout';

const ProgressPage = () => {
    return (
        <Layout title="Progresso">
            <div className="container mx-auto px-4 py-8 text-gray-900 dark:text-gray-100">
                <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Progresso</h1>
                <p className="text-gray-700 dark:text-gray-300">Em desenvolvimento...</p>
            </div>
        </Layout>
    );
};

export default ProgressPage;
