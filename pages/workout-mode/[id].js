import dynamic from 'next/dynamic';

// Carregue o componente dinamicamente com a opção ssr: false para evitar erros de hidratação
const WorkoutModeComponent = dynamic(
  () => import('../../components/WorkoutMode'),
  { ssr: false }
);

export default function WorkoutModePage() {
  return <WorkoutModeComponent />;
}