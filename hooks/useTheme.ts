import { useCallback, useEffect, useState } from 'react';
import { Profile, ThemePreference } from '../types';

interface UseThemeResult {
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  syncProfileTheme: (updatedProfile: Profile) => void;
}

export const useTheme = (initialPreference: ThemePreference): UseThemeResult => {
  const [themePreference, setThemePreference] = useState<ThemePreference>(initialPreference || 'SYSTEM');

  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      const isDark =
        themePreference === 'DARK' ||
        (themePreference === 'SYSTEM' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);

      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (themePreference === 'SYSTEM') applyTheme();
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themePreference]);

  const syncProfileTheme = useCallback(
    (updatedProfile: Profile) => {
      if (
        updatedProfile.themePreference &&
        updatedProfile.themePreference !== themePreference
      ) {
        setThemePreference(updatedProfile.themePreference);
      }
    },
    [themePreference]
  );

  return { themePreference, setThemePreference, syncProfileTheme };
};
