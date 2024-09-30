import React, { useState, useEffect, useRef } from 'react';
import { IoMdAttach } from "react-icons/io";
import { MdCancel, MdDoneAll } from "react-icons/md";
import { back, loadingGif, sender } from '../assets';
import { motion } from 'framer-motion';
import { TbMessage2Share } from "react-icons/tb";
import { MdOutlineHistory } from "react-icons/md";
import FreePlanPopup from './FreePlanPopup';
import PremiumPlanPopup from './PremiumPlanPopup';
import axios from 'axios';
import { toast } from 'react-toastify';

const ChatArea = ({ username, userImage, selectedContact, messages, onSendMessage, onBack, loading, expertId, connectionStatus, startEndTime, onShowPlanDetails, timer, showFreePlanPopup, showPremiumPlanPopup, freePlanDuration, premiumPlans, handleSelectPlan, closePlanPopups }) => {
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [chatAreaHeight, setChatAreaHeight] = useState(window.innerHeight);
  const [firstTimeMessage, setFirstTimeMessage] = useState(null); // First-time message from the expert
  const [isFirstMessageSent, setIsFirstMessageSent] = useState(false); // Track if user sent the first message
  const [sequenceMessages, setSequenceMessages] = useState([]); // Store sequence messages
  const [disableSendButton, setDisableSendButton] = useState(false); // Add disable state for send button
  const messagesEndRef = useRef(null);
  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;

  useEffect(() => {
    // Fetch if planType "D" exists with status "Pending" and disable the send button if true
    const checkPendingPlanTypeD = async () => {
      try {
        const response = await axios.get(`https://copartners.in:5137/api/ChatConfiguration/GetChatAvailUser/${sessionStorage.getItem('userId')}`);
        if (response.data.isSuccess) {
          const pendingPlanD = response.data.data.find(plan => plan.planType === "D" && plan.status === "Pending");
          if (pendingPlanD) {
            setDisableSendButton(true); // Disable send button if there's already a pending planType "D"
            // toast.info("You have already sent planType 'D' to an expert", {
            //   position: "top-right",
            //   autoClose: 5000,
            //   hideProgressBar: false,
            //   closeOnClick: true,
            //   pauseOnHover: true,
            //   draggable: true,
            // });
          } else {
            setDisableSendButton(false); // Enable send button if no pending planType "D" is found
          }
        }
      } catch (error) {
        console.error("Error checking PlanType D:", error);
      }
    };

    checkPendingPlanTypeD();
  }, [expertId]);

  const sendMessage = () => {
    if (newMessage.trim() || selectedFile) {
      const message = {
        text: newMessage.trim(),
        file: selectedFile,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sender: 'You',
      };
      onSendMessage(message);
      setNewMessage('');
      setSelectedFile(null);

      // After the first message is sent, show additional frontend messages
      if (!isFirstMessageSent) {
        setIsFirstMessageSent(true); // Set first message sent flag
        displaySequenceMessages(); // Display the sequence of frontend messages
      }
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(URL.createObjectURL(file));
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sequenceMessages]);

  useEffect(() => {
    const updateChatAreaHeight = () => {
      setChatAreaHeight(window.visualViewport.height);
    };

    window.addEventListener('resize', updateChatAreaHeight);
    return () => window.removeEventListener('resize', updateChatAreaHeight);
  }, []);

  // Show first-time message if the user has no messages yet
  useEffect(() => {
    if (messages.length === 0 && !firstTimeMessage) {
      setFirstTimeMessage({
        user: selectedContact.name,
        message: `Hi ${username}, ${selectedContact.name} will be with you shortly.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }
  }, [messages, selectedContact, username, firstTimeMessage]);

  // Function to display sequence messages after the first user message
  const displaySequenceMessages = () => {
    const raFirstName = selectedContact.name.split(' ')[0]; // Assuming RA's first name is the first word

    // Sequence of messages to show
    const messageSequence = [
      `Your timer will start when ${raFirstName} is here.`,
      'Please start typing your question ….'
    ];

    // Display the sequence of messages with a delay
    let delay = 1000; // Start with 1-second delay
    messageSequence.forEach((message, index) => {
      setTimeout(() => {
        setSequenceMessages(prev => [
          ...prev,
          { message, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]);
      }, delay);
      delay += 2000; // Increment delay for each message
    });
  };

  // Clear the frontend messages when the expert replies
  useEffect(() => {
    const expertMessage = messages.find(msg => msg.user === selectedContact.name);
    if (expertMessage) {
      // Reset the first-time and sequence messages once the expert replies
      setFirstTimeMessage(null);
      setSequenceMessages([]);
    }
  }, [messages, selectedContact]);

  return (
    <motion.div
      className="flex flex-col relative "
      style={{ height: chatAreaHeight, backgroundColor: '#fff' }}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-4 bg-transparent rounded-lg flex items-center justify-between ">
        <div className="flex items-center">
          <button className="md:hidden p-2 mr-4 bg-gray-100 rounded-full" onClick={onBack}>
            <img src={back} alt="Back" className="md:w-10 w-8" />
          </button>
          <div className="relative mr-4">
            <img
              src={selectedContact.img}
              alt={selectedContact.name}
              className="md:w-16 w-12 h-auto rounded-full bg-gray-200 border-2 border-gray-300"
            />
            <span
              className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                connectionStatus === 'Connected!' ? 'bg-green-500' : 'bg-red-500'
              }`}
            ></span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center">
              <h2 className="text-lg font-semibold text-gray-900">{selectedContact.name}</h2>
            </div>
            {timer !== null && timer > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-red-500 mt-1"
              >
                {`You've got: ${minutes}m ${seconds.toFixed()}s`}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="md:text-sm text-[10px] text-gray-500 mt-1 w-full"
              >
                Your time will start when the expert replies.
              </motion.div>
            )}
          </div>
        </div>
        <button
          className="text-[2rem] bg-[#e4e4e4] p-1 rounded-full transition-colors"
          onClick={onShowPlanDetails}
        >
          <MdOutlineHistory />
        </button>
      </div>

      <div className="flex-grow p-4 overflow-y-auto bg-[#f4f4f4] rounded-t-[30px] backgroundChat">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-full">
            <img src={loadingGif} alt="Loading..." className="w-20 h-20" />
          </div>
        ) : (
          <>
            {/* Render the first-time message if applicable */}
            {firstTimeMessage && (
              <motion.div
                className="mb-4 flex justify-start items-start gap-2.5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center">
                  <img
                    src={selectedContact.img}
                    alt={selectedContact.name}
                    className="w-8 h-8 rounded-full mr-2 bg-gray-200 border-[1px] border-gray-300"
                  />
                </div>
                <div className="flex flex-col p-2 bg-gray-200 text-black rounded-lg shadow-md max-w-75%">
                  <p className="text-sm py-2.5">{firstTimeMessage.message}</p>
                  <div className="flex justify-between text-black gap-2">
                    <span className="text-[10px]">{firstTimeMessage.timestamp}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Render the sequence messages */}
            {sequenceMessages.map((seqMsg, index) => (
              <motion.div
                key={index}
                className="mb-4 flex justify-start items-start gap-2.5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center">
                  <img
                    src={selectedContact.img}
                    alt={selectedContact.name}
                    className="w-8 h-8 rounded-full mr-2 bg-gray-200 border-[1px] border-gray-300"
                  />
                </div>
                <div className="flex flex-col p-2 bg-gray-200 text-black rounded-lg shadow-md max-w-75%">
                  <p className="text-sm py-2.5">{seqMsg.message}</p>
                  <div className="flex justify-between text-black gap-2">
                    <span className="text-[10px]">{seqMsg.timestamp}</span>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Render the actual chat messages */}
            {messages.map((message, index) => (
              <motion.div
                key={index}
                className={`mb-4 flex ${message.user === username ? 'justify-end' : 'justify-start'} items-start gap-2.5`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }} // Delay for a staggered effect
              >
                {message.user !== username && (
                  <div className="flex items-center">
                    <img
                      src={selectedContact.img}
                      alt={selectedContact.name}
                      className="w-8 h-8 rounded-full mr-2 bg-gray-200 border-[1px] border-gray-300"
                    />
                  </div>
                )}
                <div
                  className={`flex flex-col p-2 rounded-lg shadow-md ${
                    message.user === username ? 'bg-[#a7d6f79c] text-[#000] rounded-tr-none self-end' : 'bg-gray-200 text-black rounded-tl-none'
                  }`}
                  style={{ maxWidth: '75%', wordWrap: 'break-word' }}
                >
                  {message.message && <p className="text-sm py-2.5">{message.message}</p>}
                  {message.file && (
                    <img src={message.file} alt="uploaded" className="mt-2 rounded-xl max-w-full" />
                  )}
                  <div className="flex justify-between text-black gap-2">
                    <span className="text-[10px]">{message.timestamp}</span>
                    <span className="text-[10px] flex items-center gap-1">
                      {message.status || <MdDoneAll />}
                    </span>
                  </div>
                </div>
                {message.user === username && (
                  <div className="flex items-center">
                    <img src={sender} alt="You" className="w-8 h-8 rounded-full ml-2" />
                  </div>
                )}
              </motion.div>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
      {selectedFile && (
        <div className="p-4 border-t border-gray-300 flex bg-gray-200 items-center gap-2 relative">
          <img src={selectedFile} alt="selected" className="rounded-xl max-w-full mx-auto" />
          <button className="absolute top-4 right-4 bg-gray-500 text-white rounded-full p-1" onClick={removeSelectedFile}>
            <MdCancel size={25} />
          </button>
        </div>
      )}
      <div className="p-4 border-t border-gray-300 flex bg-[#a7d6f78a] items-center gap-2">
        <input
          type="text"
          className="flex-grow p-2 bg-transparent text-black placeholder-gray-500"
          placeholder="Type a message"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          disabled={disableSendButton} // Disable the input field if planType D is pending
        />
        <button
          className="p-2 bg-gradient-to-r from-[#0081F1] to-[#45C4D5] text-white rounded-full"
          onClick={sendMessage}
          disabled={disableSendButton} // Disable the send button if planType D is pending
        >
          <TbMessage2Share className='text-[22px]' />
        </button>
      </div>

      {/* Render the Plan Popups inside ChatArea */}
      {showFreePlanPopup && freePlanDuration && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <FreePlanPopup 
            freePlan={{ duration: freePlanDuration, id: expertId }}
            onSelectPlan={handleSelectPlan}
            onClose={closePlanPopups} 
          />
        </div>
      )}
      {showPremiumPlanPopup && premiumPlans.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <PremiumPlanPopup 
            plans={premiumPlans} 
            onSelectPlan={handleSelectPlan}
            onClose={closePlanPopups} 
          />
        </div>
      )}
    </motion.div>
  );
};

export default ChatArea;
