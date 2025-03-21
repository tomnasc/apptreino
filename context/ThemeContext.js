import { createContext, useContext, useEffect, useState } from 'react';

// Criar o contexto do tema
const ThemeContext = createContext();

// Hook personalizado para usar o contexto do tema
export function useTheme() {
  return useContext(ThemeContext);
}

// Provedor do contexto de tema
export function ThemeProvider({ children }) {
  // Estado para armazenar o tema atual
  const [theme, setTheme] = useState('light');
  
  // Efeito para inicializar o tema baseado na preferência salva no localStorage ou do sistema
  useEffect(() => {
    // Verificar se estamos no navegador
    if (typeof window !== 'undefined') {
      // Verificar se há uma preferência salva no localStorage
      const savedTheme = localStorage.getItem('theme');
      
      if (savedTheme) {
        // Se houver uma preferência salva, usá-la
        setTheme(savedTheme);
      } else {
        // Se não houver preferência salva, verificar a preferência do sistema
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
      }
    }
  }, []);

  // Efeito para aplicar o tema atual no HTML
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Adicionar ou remover classe 'dark' no elemento HTML
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
      
      // Salvar a preferência no localStorage
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  // Função para alternar entre os temas
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  // Valor do contexto
  const value = {
    theme,
    isLightTheme: theme === 'light',
    isDarkTheme: theme === 'dark',
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
} 