import React from 'react';
import Logo from "../../assets/icons/fl.png"

export const QuantumSparkLogo = () => {
  return (
    <div className="flex items-center gap-1 select-none font-Inter">
      {/* 
        Container with Flare theme background.
        The background is solid, deep pink (#E62058) in both modes.
      */}
      <div className="relative w-5 h-5 flex items-center justify-center rounded-xl bg-[#E62058] shadow-md flex-shrink-0 overflow-hidden">
        <img alt='Logo' src={Logo} className='' />
      </div>

      {/* Text layout, unchanged from original */}
      <div className="flex items-center tracking-tight text-xs leading-none font-medium">
        {/* Black in Light Mode / White in Dark Mode */}
        <span className="text-black dark:text-white">
          flareGPT
        </span>
        {/* Small space & custom color */}
        {/* <span className="ml-[2px] font-bold" style={{ color: '#E62058' }}>
          gpt
        </span> */}
      </div>
    </div>
  );
};

export default QuantumSparkLogo;