import { useState, useEffect, createContext, useContext } from 'react';

const ThemeContext = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API_URL = `${BACKEND_URL}/api`;

// Применение темы к документу
const applyTheme = (theme) => {
  const root = document.documentElement;
  
  // Удаляем все классы тем
  root.classList.remove('light', 'dark', 'theme-blue', 'theme-green', 'theme-purple', 
    'theme-dark-blue', 'theme-dark-green', 'theme-dark-purple');
  
  // Добавляем класс режима (light/dark)
  if (theme.mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.add('light');
  }
  
  // Добавляем класс палитры
  let paletteClass;
  if (theme.mode === 'dark') {
    // Для тёмной темы палитры: dark-blue -> theme-dark-blue
    paletteClass = `theme-${theme.palette}`;
  } else {
    // Для светлой темы: blue -> theme-blue (или просто не добавляем, так как это дефолт)
    if (theme.palette !== 'blue') {
      paletteClass = `theme-${theme.palette}`;
    }
  }
  
  // Применяем палитру если она не дефолтная (blue для светлой темы)
  if (paletteClass) {
    root.classList.add(paletteClass);
  }
};

export const ThemeProvider = ({ children }) => {
  // Инициализируем тему из localStorage СРАЗУ, чтобы избежать FOUC
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('maksum-theme');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Применяем тему СРАЗУ при инициализации
        applyTheme(parsed);
        return parsed;
      } catch (e) {
        console.error('Error parsing theme from localStorage:', e);
      }
    }
    const defaultTheme = {
      mode: 'light',
      palette: 'blue'
    };
    // Применяем дефолтную тему сразу
    applyTheme(defaultTheme);
    return defaultTheme;
  });
  
  const [isLoading, setIsLoading] = useState(true);

  // Загружаем тему из API при монтировании
  useEffect(() => {
    const loadThemeFromAPI = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          // Если не авторизован, используем localStorage
          setIsLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/user/theme`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        });

        if (response.ok) {
          const apiTheme = await response.json();
          setTheme(apiTheme);
          localStorage.setItem('maksum-theme', JSON.stringify(apiTheme));
          applyTheme(apiTheme);
        } else {
          // Если API недоступен, используем localStorage
          const saved = localStorage.getItem('maksum-theme');
          if (saved) {
            const localTheme = JSON.parse(saved);
            setTheme(localTheme);
            applyTheme(localTheme);
          }
        }
      } catch (error) {
        console.error('Failed to load theme from API:', error);
        // Используем localStorage как fallback
        const saved = localStorage.getItem('maksum-theme');
        if (saved) {
          const localTheme = JSON.parse(saved);
          setTheme(localTheme);
          applyTheme(localTheme);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadThemeFromAPI();
  }, []);

  // Применяем тему при изменении
  useEffect(() => {
    if (!isLoading) {
      applyTheme(theme);
    }
  }, [theme, isLoading]);

  const changeTheme = async (mode, palette) => {
    const newTheme = { mode, palette };
    
    // Сразу применяем тему локально
    setTheme(newTheme);
    localStorage.setItem('maksum-theme', JSON.stringify(newTheme));
    
    // Сохраняем в API асинхронно
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${API_URL}/user/theme`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newTheme),
        });
      }
    } catch (error) {
      console.error('Failed to save theme to API:', error);
      // Тема уже применена локально, так что ошибка не критична
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, changeTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

