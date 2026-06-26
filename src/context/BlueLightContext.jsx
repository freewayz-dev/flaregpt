import { createContext, useContext, useState } from "react";

const BlueLightContext = createContext();

export function BlueLightProvider({ children }) {
  const [level, setLevel] = useState(
    localStorage.getItem("blueLight") || "Off"
  );

  const updateLevel = (value) => {
    setLevel(value);
    localStorage.setItem("blueLight", value);
  };

  return (
    <BlueLightContext.Provider
      value={{
        level,
        updateLevel,
      }}
    >
      {children}
    </BlueLightContext.Provider>
  );
}

export const useBlueLight = () => useContext(BlueLightContext);