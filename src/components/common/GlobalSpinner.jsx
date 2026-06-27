// src/components/common/MinimalProgressBar.jsx
export default function GlobalSpinner() {
  return (
  <div className="flex items-center justify-center h-screen bg-[#F0F4F9] dark:bg-[#09090b]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E62058]"></div>
    </div>
  );
}