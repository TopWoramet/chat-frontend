import { useState, useEffect } from "react";

const useLocalStorage = (key: string, initialValue: string) => {
  const [storedValue, setStoredValue] = useState<string>(initialValue);
  const [initialized, setInitialized] = useState<boolean>(false);

  useEffect(() => {
    if (!initialized && typeof window !== "undefined") {
      try {
        const item = localStorage.getItem(key);
        setStoredValue(item ? item : initialValue);
        setInitialized(true);
      } catch (error) {
        console.error(error);
      }
    }
  }, [initialized, key, initialValue]);

  const setValue = (value: string) => {
    if (typeof window !== "undefined") {
      try {
        setStoredValue(value);
        localStorage.setItem(key, value);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const removeValue = () => {
    if (typeof window !== "undefined") {
      try {
        setStoredValue(initialValue);
        localStorage.removeItem(key);
      } catch (error) {
        console.error(error);
      }
    }
  };

  return [storedValue, initialized, setValue, removeValue] as const;
};

export default useLocalStorage;
