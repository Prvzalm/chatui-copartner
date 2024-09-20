import React from 'react';
import { useNavigate } from 'react-router-dom';

const PendingPlanPopup = ({ onClose, pendingExpertName, pendingExpertId, userId, username }) => {
    const navigate = useNavigate();
  
    const handleOkClick = () => {
      // Add the expertId (pendingExpertId) as the third parameter in the URL
      const newPath = `/${userId}/${username}/${pendingExpertId}`;
      navigate(newPath, { replace: true });
      
      // Close the popup
      onClose();
    };
  
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-lg font-bold mb-4">Pending Plan with {pendingExpertName}</h2>
          <p className="text-gray-600 mb-4">
            You have a pending plan with {pendingExpertName}. You can only proceed after the plan expires.
          </p>
          <button 
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={handleOkClick}
          >
            OK
          </button>
        </div>
      </div>
    );
  };
  
  export default PendingPlanPopup;
  