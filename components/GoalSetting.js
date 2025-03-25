import React, { useState } from 'react';

const GoalSetting = () => {
    const [goalType, setGoalType] = useState('');
    const [goalValue, setGoalValue] = useState('');
    const [deadline, setDeadline] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        // Aqui você pode adicionar a lógica para enviar a meta para a API
    };

    return (
        <div>
            <h1 className="dark-text-primary">Definição de Metas</h1>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Tipo de Meta"
                    value={goalType}
                    onChange={(e) => setGoalType(e.target.value)}
                    required
                    className="dark-input"
                />
                <input
                    type="number"
                    placeholder="Valor da Meta"
                    value={goalValue}
                    onChange={(e) => setGoalValue(e.target.value)}
                    required
                    className="dark-input"
                />
                <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required
                    className="dark-input"
                />
                <button type="submit" className="btn-primary">Salvar Meta</button>
            </form>
        </div>
    );
};

export default GoalSetting;
