// utils/getBlurClass.js

export const getBlurClass = (level) => {
  switch (level) {
    case "Low":
      return "backdrop-blur-sm";

    case "Medium":
      return "backdrop-blur-md";

    case "High":
      return "backdrop-blur-xl";

    default:
      return "backdrop-blur-none";
  }
};