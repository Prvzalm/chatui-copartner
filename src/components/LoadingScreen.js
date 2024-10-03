import React from "react";
import { ImSpinner2 } from "react-icons/im"; // Using a spinner icon for a better visual effect

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70 pointer-events-none">
      <div className="flex flex-col items-center">
        <ImSpinner2 className="animate-spin text-white text-5xl mb-4" />
        <div className="text-white text-lg font-semibold">
          Processing your payment, please wait...
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
