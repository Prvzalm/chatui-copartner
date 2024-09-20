import React, { useState, useEffect } from "react";
import { logo, sebi, loadingGif, chatIcon } from "../assets";
import { IoMdClose, IoMdSearch } from "react-icons/io";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const ContactItem = ({
  contact,
  unreadCount, // The unread message count passed from ChatList
  onSelectContact,
  premiumPrice,
  hasGlobalUsedPlanD
}) => {
  const contactImage =
    contact.img || contact.expertImagePath; // Use either contact image or expert image path

  return (
    <div
      className="relative mx-3 flex flex-col items-center p-4 cursor-pointer bg-[#fff] hover:bg-gray-100 border-[#00000021] transition duration-200 mb-4 border-2 rounded-3xl"
      onClick={() => onSelectContact(contact)}
    >
      <div className="flex flex-row justify-between items-center w-full">
        <img src={sebi} alt="" className="w-10 ml-3" />
        <p className="text-[13px] text-gray-600">{contact.sebiRegNo}</p>
      </div>
      <div className="flex flex-row justify-between items-center w-full">
        <img
          src={contactImage}
          alt={contact.name}
          className="w-16 h-16 rounded-full border-[1px] border-[#00000053] bg-gray-200"
        />
        <div className="flex-1">
          <div className="text-gray-600 text-sm flex flex-row justify-between">
            <div className="flex flex-col w-[150px]">
              <span className="text-gray-800 text-[20px] font-medium ml-3 font-poppins">
                {contact.channelName}
              </span>
              <p className="font-regular ml-3 font-poppins text-[#24243f92]">
                {contact.name}
              </p>
              <div className="flex gap-2 ml-3">
                {premiumPrice ? (
                  hasGlobalUsedPlanD ? (
                    <p className="text-[17px] font-bold">₹{premiumPrice}/min</p>
                  ) : (
                    <>
                      <p className="text-[17px] font-bold line-through">
                        ₹{premiumPrice}/min
                      </p>
                      <span className="text-gradient-2 font-bold text-[17px]">
                        FREE
                      </span>
                    </>
                  )
                ) : (
                  <span className="text-gradient-2 font-bold text-[17px]">
                    FREE
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end justify-evenly">
              <button
                className="border-2 border-[#00ACFF] bg-[#00aaff19] text-[#00ACFF] hover:text-white font-semibold font-poppins text-[17px] flex items-center transition-all py-4 px-4 rounded-[1.2rem]"
                onClick={() => onSelectContact(contact)}
              >
                <img src={chatIcon} alt="" className="w-6 mr-3" />
                Chat
              </button>

              {/* Display unread message count if greater than 0 */}
              {unreadCount > 0 && (
                <div className="absolute top-0 right-0 mt-2 mr-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {unreadCount}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


const ChatList = ({
  contacts,
  onSelectContact,
  conversations,
  unreadMessages,
  loading,
  setPlanType,
  setLatestTimespan,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Experts");
  const [chatListHeight, setChatListHeight] = useState(window.innerHeight);
  const [experts, setExperts] = useState([]);
  const [loadingExperts, setLoadingExperts] = useState(true);
  const [contactsData, setContactsData] = useState(contacts);
  const [premiumPrices, setPremiumPrices] = useState({}); // Store premium prices
  const [usedPlanD, setUsedPlanD] = useState({}); // Store which experts have plan D used
  const [hasGlobalUsedPlanD, setHasGlobalUsedPlanD] = useState(false); // Track global Plan D usage

  const navigate = useNavigate();
  const location = useLocation();

  const handleSearchClick = () => {
    setIsSearchOpen(true);
  };

  const handleSearchClose = () => {
    setIsSearchOpen(false);
    setSearchTerm(""); 
  };

  const getExpertType = (typeId) => {
    switch (typeId) {
      case 1:
        return "Commodity";
      case 2:
        return "Equity";
      case 3:
        return "Futures & Options";
      default:
        return "Unknown";
    }
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setSearchTerm(""); // Clear the search term when switching tabs
  };

  const truncateMessage = (message, maxLength = 30) => {
    if (!message) return "";
    return message.length > maxLength
      ? `${message.slice(0, maxLength)}...`
      : message;
  };

  useEffect(() => {
    const updateChatListHeight = () => {
      setChatListHeight(window.innerHeight);
    };

    window.addEventListener("resize", updateChatListHeight);
    return () => window.removeEventListener("resize", updateChatListHeight);
  }, []);

  useEffect(() => {
    const fetchExperts = async () => {
      setLoadingExperts(true);
      try {
        const response = await axios.get(
          "https://copartners.in:5132/api/Experts?page=1&pageSize=1000"
        );
        if (response.data.isSuccess) {
          const fetchedExperts = response.data.data.filter(
            (expert) => expert.isChatLive
          );
          setExperts(fetchedExperts);

          // Fetch premium prices and planType D info for experts
          const premiumPrices = await Promise.all(
            fetchedExperts.map(async (expert) => {
              const planResponse = await axios.get(
                `https://copartners.in:5137/api/ChatConfiguration/GetChatPlanByExpertsId/${expert.id}?page=1&pageSize=10`
              );
          
              if (planResponse.data.isSuccess) {
                const premiumPlans = planResponse.data.data.filter(
                  (plan) => plan.planType === "P" // Only consider premium plans
                );
          
                if (premiumPlans.length > 0) {
                  // Find the premium plan with the highest price
                  const highestPremiumPlan = premiumPlans.reduce((prev, current) => {
                    return (prev.price > current.price) ? prev : current;
                  });
          
                  // Calculate price per minute for the highest premium plan
                  const pricePerMinute = highestPremiumPlan.price / highestPremiumPlan.duration;
          
                  return { expertId: expert.id, price: pricePerMinute };
                }
              }
              return null;
            })
          );
          
          // Use the fetched pricePerMinute for each expert
          const pricesObj = premiumPrices.reduce((acc, item) => {
            if (item) {
              acc[item.expertId] = item.price;
            }
            return acc;
          }, {});
          
          setPremiumPrices(pricesObj);
          
        }
      } catch (error) {
        console.error("Error fetching experts: ", error);
      } finally {
        setLoadingExperts(false);
      }
    };

    fetchExperts();

    const intervalId = setInterval(fetchExperts, 30000); // Fetch data every 30 seconds

    return () => clearInterval(intervalId); // Clear interval on component unmount
  }, []);

  useEffect(() => {
    // Check if planType "D" has been used globally
    const checkIfPlanDUsed = async () => {
      try {
        const response = await axios.get(
          `https://copartners.in:5137/api/ChatConfiguration/GetChatAvailUser/${sessionStorage.getItem('userId')}`
        );
        if (response.data.isSuccess) {
          const hasUsedPlanD = response.data.data.some(plan => plan.planType === 'D');
          setHasGlobalUsedPlanD(hasUsedPlanD);
        }
      } catch (error) {
        console.error("Error checking Plan D usage: ", error);
      }
    };

    checkIfPlanDUsed();
  }, []);

  useEffect(() => {
    setContactsData(contacts);
  }, [contacts]);

  const handleContactSelect = (contact) => {
    const pathSegments = location.pathname.split("/");
    const userId = pathSegments[1];
    const username = pathSegments[2];

    let newPath;
    if (activeTab === "Experts") {
      newPath = `/${userId}/${username}/${contact.id}`;
      sessionStorage.setItem("expertId", contact.id);
    } else {
      newPath = `/${userId}/${username}/${contact.expertsId}`;
      sessionStorage.setItem("expertId", contact.expertsId);
    }

    navigate(newPath);

    const storedPlanType = sessionStorage.getItem(
      `planType_${contact.expertsId}`
    );
    if (storedPlanType) {
      setPlanType(storedPlanType);
    } else {
      setPlanType("D");
    }

    const storedTimespan = sessionStorage.getItem(
      `timespan_${contact.expertsId}`
    );
    if (storedTimespan) {
      setLatestTimespan(JSON.parse(storedTimespan));
    } else {
      setLatestTimespan(null);
    }

    onSelectContact(contact);
  };

  const filteredContacts =
    activeTab === "Chats"
      ? contactsData.filter((contact) =>
          contact.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : experts.filter((expert) =>
          expert.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

  return (
    <div
      className="relative min-h-screen bg-white"
      style={{ height: chatListHeight }}
    >
      <div className="flex flex-col h-full">
        <div className="flex flex-row justify-between items-center mb-4 px-4 py-2 mt-1">
          {/* Hide logo when search is open */}
          {!isSearchOpen && (
            <motion.img
              src={logo}
              alt="Logo"
              className="w-50 h-[40px]"
              initial={{ opacity: 1 }}
              animate={{ opacity: isSearchOpen ? 0 : 1 }}
            />
          )}
          
          <motion.div
            className={`flex items-center border-[1px] rounded-full p-2 border-[#00000028] bg-gray-100 ${isSearchOpen ? 'w-full' : 'w-auto'}`}
            initial={{ width: 'auto' }}
            animate={{
              width: isSearchOpen ? '100%' : 'auto',
              transition: { type: 'spring', stiffness: 200, damping: 20 }
            }}
          >
            {/* Show search icon or input based on state */}
            {isSearchOpen ? (
              <>
                <input
                  type="text"
                  placeholder="Search Chats or Experts"
                  className="bg-transparent text-gray-600 focus:outline-none ml-2 flex-grow"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
                <IoMdClose
                  className="w-6 h-6 text-gray-600 cursor-pointer ml-2"
                  onClick={handleSearchClose}
                />
              </>
            ) : (
              <IoMdSearch
                className="w-6 h-6 text-gray-600 cursor-pointer"
                onClick={handleSearchClick}
              />
            )}
          </motion.div>
      
        </div>
        <div className="flex-grow pt-3 chat-div rounded-t-[30px] bg-[#d9d9d96c]">
          <div className="flex justify-start gap-2 mb-4 px-4">
            <button
              className={`hidden px-4 py-2 ${
                activeTab === "Chats"
                  ? "text-[#000] font-semibold text-[1.5rem] font-poppins"
                  : "text-gray-600"
              }`}
              onClick={() => handleTabClick("Chats")}
            >
              Chat
            </button>

            <button
              className={`hidden px-4 border py-2 rounded-[10px] ${
                activeTab === "WaitList"
                  ? "bg-[#000] text-[#fff]"
                  : "bg-transparent text-gray-600 border-[#000]"
              }`}
              onClick={() => handleTabClick("WaitList")}
            >
              WaitList
            </button>
            <button
              className={` px-4 py-2 rounded-[10px] ${
                activeTab === "Experts"
                  ? "text-[#000] font-semibold text-[1.5rem] font-poppins"
                  : "text-gray-600"
              }`}
              onClick={() => handleTabClick("Experts")}
            >
              Experts
            </button>
          </div>
          {activeTab === "Chats" &&
            (loading ? (
              <div className="flex flex-col justify-center items-center h-full">
                <img src={loadingGif} alt="Loading..." className="w-16 h-16" />
                <h1 className="text-gray-700 text-lg">Loading...</h1>
              </div>
            ) : (
              <div className="overflow-y-auto h-[calc(100vh-200px)] md:h-[calc(100vh-150px)] bg-transparent">
               {filteredContacts.map((contact, index) => {
  const lastMessage = conversations[contact.name]?.slice(-1)[0] || {};
  const truncatedMessage = truncateMessage(
    lastMessage.sender === "You"
      ? `You: ${lastMessage.text}`
      : lastMessage.text
  );

  const unreadCount = unreadMessages[contact.expertsId] || 0; // Get unread message count for this contact

                  return (
                    <ContactItem
                      key={index}
                      contact={contact}
                      unreadCount={unreadCount}
                      onSelectContact={handleContactSelect}
                      getExpertType={getExpertType}
                      activeTab={activeTab}
                      premiumPrice={premiumPrices[contact.expertsId] || null} // Pass the highest premium price
                      hasUsedPlanD={usedPlanD[contact.expertsId]} // Pass if planType D was used for the expert
                      hasGlobalUsedPlanD={hasGlobalUsedPlanD} // Pass global Plan D usage
                    />
                  );
                })}
              </div>
            ))}
          {activeTab === "WaitList" && (
            <div className="overflow-y-auto h-[calc(100vh-200px)] md:h-[calc(100vh-150px)]">
              {experts.map((expert, index) => (
                <ContactItem
                  key={index}
                  contact={expert}
                  unreadCount={0}
                  onSelectContact={handleContactSelect}
                  getExpertType={getExpertType}
                  activeTab={activeTab}
                  premiumPrice={premiumPrices[expert.id] || null} // Pass the highest premium price
                  hasUsedPlanD={usedPlanD[expert.id]} // Pass if planType D was used for the expert
                  hasGlobalUsedPlanD={hasGlobalUsedPlanD} // Pass global Plan D usage
                />
              ))}
            </div>
          )}
          {activeTab === "Experts" && (
            <div className="overflow-y-auto h-[calc(100vh-200px)] md:h-[calc(100vh-150px)]">
              {filteredContacts.map((expert, index) => (
                <ContactItem
                  key={index}
                  contact={expert}
                  unreadCount={0}
                  onSelectContact={handleContactSelect}
                  getExpertType={getExpertType}
                  activeTab={activeTab}
                  premiumPrice={premiumPrices[expert.id] || null} // Pass the highest premium price
                  hasUsedPlanD={usedPlanD[expert.id]} // Pass if planType D was used for the expert
                  hasGlobalUsedPlanD={hasGlobalUsedPlanD} // Pass global Plan D usage
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatList;
