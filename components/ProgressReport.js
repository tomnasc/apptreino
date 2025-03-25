import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const ProgressReport = () => { 
    const data = {
        labels: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio'], // Exemplo de meses
        datasets: [
            {
                label: 'Peso Levantado (kg)',
                data: [50, 60, 70, 80, 90], // Exemplo de dados
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
            x: {
                ticks: {
                    autoSkip: true,
                    maxRotation: 45,
                    minRotation: 45
                }
            }
        }
    };

return (
    <div className="p-4 w-full max-w-full">
        <h1 className="dark-text-primary mb-4">Relatório de Progresso</h1>
        <div className="relative w-full" style={{ height: '50vh', minHeight: '300px', maxHeight: '600px' }}>
            <Bar data={data} options={options} />
        </div>
    </div>
);
};

export default ProgressReport;
