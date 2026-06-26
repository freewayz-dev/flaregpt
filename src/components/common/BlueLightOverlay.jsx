import { useUIStore } from "../../store/useUIStore";

export default function BlueLightOverlay() {
  // Selectively subscribe to the live blue light state value
  const level = useUIStore((state) => state.blueLightLevel);

  const getStyles = () => {
    switch (level) {
      case "Low":
        return "bg-orange-200/15 mix-blend-multiply";
      case "Medium":
        return "bg-orange-300/25 mix-blend-multiply";
      case "High":
        return "bg-orange-400/35 mix-blend-multiply";
      default:
        return "";
    }
  };

  if (level === "Off") return null;

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-[100] transition-colors duration-500 ${getStyles()}`}
    />
  );
}
