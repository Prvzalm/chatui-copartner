import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ChatList from "./ChatList";
import ChatArea from "./ChatArea";
import PlanPopup from "./PlanPopup";
import FreePlanPopup from "./FreePlanPopup";
import PremiumPlanPopup from "./PremiumPlanPopup";
import logo from "../assets/copartnerBlack.png";
import * as signalR from "@microsoft/signalr";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import SubscriptionMinorPopup from "./SubscriptionMinorPopup";

const ChatApp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const touchStartXRef = useRef(0); // Ref to store initial touch position
  const touchEndXRef = useRef(0); // Ref to store final touch position
  const swipeThreshold = 100;

  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState({});
  const [unreadMessages, setUnreadMessages] = useState({});
  const [contacts, setContacts] = useState([]);
  const [expertId, setExpertId] = useState(null);
  const connectionRef = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState("Not connected");
  const [loading, setLoading] = useState(false);
  const [userImage, setUserImage] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [showPlanPopup, setShowPlanPopup] = useState(false);
  const [planDetails, setPlanDetails] = useState([]);
  const [showFreePlanPopup, setShowFreePlanPopup] = useState(false);
  const [showPremiumPlanPopup, setShowPremiumPlanPopup] = useState(false);
  const [freePlanDuration, setFreePlanDuration] = useState(null);
  const [premiumPlans, setPremiumPlans] = useState([]);
  const [planId, setPlanId] = useState("");
  const [paidPlanId, setPaidPlanId] = useState("");
  const [expertsData, setExpertsData] = useState({});
  const [currentExpertId, setCurrentExpertId] = useState(null);
  const [hasUsedPlanD, setHasUsedPlanD] = useState(false);
  const [showSubscriptionPopup, setShowSubscriptionPopup] = useState(false); // Add state for the payment popup
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paidPlanChatId, setPaidPlanChatId] = useState(null);
  const [isFirstReplyReceived, setIsFirstReplyReceived] = useState(
    sessionStorage.getItem(`firstReplyReceived_${currentExpertId}`) === "true"
  );

  const checkPaymentStatus = (transactionId) => {
    fetch(
      `https://copartners.in:5137/api/ChatConfiguration/GetChatSubscribe/${transactionId}`
    )
      .then((response) => response.json())
      .then((data) => {
        if (data.isSuccess) {
          const { chatPlanId } = data.data;
          setPaidPlanChatId(chatPlanId);

          // Store the paid chatPlanId in sessionStorage
          sessionStorage.setItem(`paidChatPlan_${chatPlanId}`, "true");

          // Close popups after successful payment
          setShowPremiumPlanPopup(false);
          setShowSubscriptionPopup(false);
        } else {
          console.error("Payment status check failed:", data.errorMessages);
        }
      })
      .catch((error) => {
        console.error("Error fetching payment status:", error);
      });
  };

  // Check payment status on page load
  useEffect(() => {
    const transactionId = sessionStorage.getItem("transactionId");
    if (transactionId) {
      checkPaymentStatus(transactionId); // Check payment status with stored transaction ID
    }
  }, []);

  const handleOpenPaymentPopup = (plan) => {
    console.log(plan);
    setSelectedPlan(plan);
    setShowSubscriptionPopup(true); // Open the payment modal
  };

  // Close the payment popup
  const handleClosePaymentPopup = () => {
    setShowSubscriptionPopup(false);
    setSelectedPlan(null);
  };

  const closePlanPopups = () => {
    setShowFreePlanPopup(false);
    setShowPremiumPlanPopup(false);
  };

  const goBackToChatList = () => {
    closePlanPopups();
    setSelectedContact(null);

    // Remove the expertId from the URL when navigating back to ChatList
    const pathSegments = location.pathname.split("/");
    const userId = pathSegments[1];
    const username = pathSegments[2];
    const newPath = `/${userId}/${username}`;
    navigate(newPath, { replace: true });
  };

  // Function to handle touch start
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  // Function to handle touch move
  const handleTouchMove = (e) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  // Function to handle touch end and determine if it's a swipe
  const handleTouchEnd = () => {
    const touchStartX = touchStartXRef.current;
    const touchEndX = touchEndXRef.current;
    const touchDistance = touchEndX - touchStartX;

    // Check if swipe is from left to right and exceeds the threshold
    if (touchDistance > swipeThreshold) {
      goBackToChatList(); // Trigger navigation back to chat list
    }
  };

  // Function to handle back button press in mobile browsers
  const handlePopState = () => {
    if (selectedContact) {
      goBackToChatList();
    }
  };

  useEffect(() => {
    // Add touch event listeners on component mount
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);

    // Add event listener for back button in mobile browsers
    window.addEventListener("popstate", handlePopState);

    // Clean up event listeners on component unmount
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [selectedContact]);

  const handleExpiredTimer = (expertId) => {
    if (expertId !== currentExpertId) return;

    console.log("Timer expired, refreshing the page...");
    setExpertsData((prevData) => ({
      ...prevData,
      [expertId]: {
        ...prevData[expertId],
        timer: null,
      },
    }));

    sessionStorage.removeItem(`timer_${expertId}`);
    sessionStorage.removeItem("isTimerRunning");
    sessionStorage.removeItem("transactionId");
    sessionStorage.removeItem(`paidChatPlan_${paidPlanChatId}`);
    window.location.reload();
  };

  const checkPlanTypeDGlobal = async (userId) => {
    try {
      const response = await axios.get(
        `https://copartners.in:5137/api/ChatConfiguration/GetChatAvailUser/${userId}`
      );
      if (response.data.isSuccess) {
        const hasUsedDWithAnyExpert = response.data.data.some(
          (plan) => plan.planType === "D"
        );
        setHasUsedPlanD(hasUsedDWithAnyExpert); // Store the result in the state
      }
    } catch (error) {
      console.error("Error checking PlanType D:", error);
    }
  };
  const fetchPlans = async (userId, expertId) => {
    try {
      const pendingExpert = sessionStorage.getItem(`pending_${expertId}`);
      
      // Check if expert is marked as pending and prevent popups if true
      if (pendingExpert) {
        setShowFreePlanPopup(false);
        setShowPremiumPlanPopup(false);
        console.log("Expert is pending, no popups shown.");
        return;
      }
  
      const chatAvailResponse = await axios.get(
        `https://copartners.in:5137/api/ChatConfiguration/GetChatAvailUser/${userId}`
      );
  
      if (chatAvailResponse.data.isSuccess) {
        const chatAvailPlans = chatAvailResponse.data.data;
  
        // Check if any planType "D" is already pending with another expert
        const pendingPlanD = chatAvailPlans.find(
          (plan) => plan.planType === "D" && plan.status === "Pending"
        );
  
        if (pendingPlanD) {
          // Show toast and prevent user from sending another planType "D"
          toast.info("You have already sent planType 'D' to an expert", {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
  
          // Prevent sending planType "D" to another expert
          setShowFreePlanPopup(false);
          setShowPremiumPlanPopup(false);
          return;
        }
  
        // Rest of the fetchPlans logic for showing Free and Premium plan popups
        const usedFreePlansForThisExpert = chatAvailPlans.filter(
          (plan) => plan.planType === "F" && plan.expertsId === expertId
        );
        const hasUsedDWithAnyExpert = chatAvailPlans.some(
          (plan) => plan.planType === "D"
        );
  
        // Check if planType "D" has been used with any expert globally
        if (hasUsedDWithAnyExpert) {
          console.log("User has used planType 'D' globally. Ensuring popups open accordingly.");
  
          const expertPlansResponse = await axios.get(
            `https://copartners.in:5137/api/ChatConfiguration/GetChatPlanByExpertsId/${expertId}?page=1&pageSize=10`
          );
  
          if (expertPlansResponse.data.isSuccess) {
            const expertPlans = expertPlansResponse.data.data;
            const availableFreePlans = expertPlans.filter(
              (plan) => plan.planType === "F"
            );
            const premiumPlans = expertPlans.filter(
              (plan) => plan.planType === "P"
            );
            setPremiumPlans(premiumPlans);
  
            const allFreePlansUsed = availableFreePlans.every((freePlan) =>
              usedFreePlansForThisExpert.some(
                (usedPlan) => usedPlan.chatPlanId === freePlan.id
              )
            );
  
            const isTimerRunning = sessionStorage.getItem(`timer_${expertId}`);
  
            if (allFreePlansUsed && premiumPlans.length > 0 && !isTimerRunning) {
              setShowPremiumPlanPopup(true);
              setShowFreePlanPopup(false);
            } else if (!allFreePlansUsed && !isTimerRunning) {
              const nextUnusedFreePlan = availableFreePlans.find(
                (freePlan) =>
                  !usedFreePlansForThisExpert.some(
                    (usedPlan) => usedPlan.chatPlanId === freePlan.id
                  )
              );
              if (nextUnusedFreePlan) {
                setFreePlanDuration(nextUnusedFreePlan.duration);
                setPlanId(nextUnusedFreePlan.id);
                setShowFreePlanPopup(true);
                setShowPremiumPlanPopup(false);
              }
            }
          }
        } else {
          // If no "D" plan is used, do not show any popups
          setShowFreePlanPopup(false);
          setShowPremiumPlanPopup(false);
        }
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };
  

  const checkLastMessageStatus = async (userId, expertId) => {
    try {
      const response = await axios.get(
        `https://copartners.in:5137/api/ChatConfiguration/GetChatUsersById/${userId}`
      );
      if (response.data.isSuccess) {
        const userChatData = response.data.data;

        // Log the fetched data for debugging
        console.log("Fetched user chat data:", userChatData);

        // Find the correct expert chat data by comparing IDs
        const expertChatData = userChatData.find(
          (chat) => chat.id === expertId
        );

        if (expertChatData) {
          const { status, contents } = expertChatData;

          // Log status and contents for debugging
          console.log(`Status for expert ${expertId}:`, status);
          console.log(`Contents of the message: ${contents}`);
          sessionStorage.removeItem(`pending_${expertId}`);

          // If the status is "Pending", do not call GetChatAvailUser or GetChatPlanByExpertsId APIs
          if (status === "Pending") {
            console.log(
              "Status is PENDING. No popups or API calls will be made."
            );
            sessionStorage.setItem(`pending_${expertId}`, true);
            return; // Exit the function to prevent further API calls
          }

          // If status is "EXPIRED", proceed to fetch plans
          if (status === "Expired") {
            console.log("Status is EXPIRED. Fetching plans.");
            fetchPlans(userId, expertId); // Open popup logic for expired status
          } else {
            console.log(`Unhandled status: ${status}`);
          }
        } else {
          console.log(`No chat data found for expertId: ${expertId}`);
        }
      } else {
        console.log("Failed to retrieve chat data.");
      }
    } catch (error) {
      console.error("Error checking the last message status:", error);
    }
  };

  useEffect(() => {
    const pathSegments = location.pathname.split("/");
    const potentialUserId = pathSegments[1];
    const potentialUsername = pathSegments[2];
    const expertIdFromPath = pathSegments[3];

    if (potentialUserId && expertIdFromPath) {
      setCurrentExpertId(expertIdFromPath);
      setUserId(potentialUserId);

      // Check the latest message status for the current expert and only fetch plans if necessary
      checkLastMessageStatus(potentialUserId, expertIdFromPath);
    }

    if (expertIdFromPath) {
      setCurrentExpertId(expertIdFromPath);
      setExpertId(expertIdFromPath);
      sessionStorage.setItem("expertId", expertIdFromPath);
    }

    const resetTimerAndTimespan = () => {
      setExpertsData((prevData) => ({
        ...prevData,
        [expertIdFromPath]: {
          ...prevData[expertIdFromPath],
          timer: null,
          latestTimespan: null,
          planType: "D",
        },
      }));
    };

    resetTimerAndTimespan();

    const storedTimespan = sessionStorage.getItem(
      `timespan_${expertIdFromPath}`
    );
    const storedTimer = sessionStorage.getItem(`timer_${expertIdFromPath}`);
    const storedPlanType = sessionStorage.getItem(
      `planType_${expertIdFromPath}`
    );

    if (storedTimespan) {
      setExpertsData((prevData) => ({
        ...prevData,
        [expertIdFromPath]: {
          ...prevData[expertIdFromPath],
          latestTimespan: JSON.parse(storedTimespan),
        },
      }));
    }

    if (storedTimer) {
      setExpertsData((prevData) => ({
        ...prevData,
        [expertIdFromPath]: {
          ...prevData[expertIdFromPath],
          timer: parseInt(storedTimer, 10),
        },
      }));
    }

    if (storedPlanType) {
      setExpertsData((prevData) => ({
        ...prevData,
        [expertIdFromPath]: {
          ...prevData[expertIdFromPath],
          planType: storedPlanType,
        },
      }));
    }

    if (potentialUserId) {
      setUserId(potentialUserId);
      sessionStorage.setItem("userId", potentialUserId);
      checkPlanTypeDGlobal(potentialUserId); // Check global Plan D usage on initial load
    } else {
      console.error("Invalid userId in URL path");
    }

    if (potentialUsername && /^[0-9]{10}$/.test(potentialUsername)) {
      setUsername(potentialUsername);
    } else {
      console.error("Invalid username in URL path");
    }

    const fetchUserImage = async () => {
      const userImg = "https://example.com/path-to-user-image.jpg";
      setUserImage(userImg);
    };

    const fetchContacts = async () => {
      setLoadingContacts(true);
      try {
        const response = await axios.get(
          `https://copartners.in:5137/api/ChatConfiguration/GetChatUsersById/${potentialUserId}`
        );
        if (response.data.isSuccess) {
          const filteredUsers = response.data.data.filter(
            (user) => user.userType === "RA"
          );
          const fetchedContacts = await Promise.all(
            filteredUsers.map(async (user) => {
              const expertResponse = await axios.get(
                `https://copartners.in:5132/api/Experts/${user.id}`
              );
              if (expertResponse.data.isSuccess) {
                return {
                  name: expertResponse.data.data.name,
                  img: expertResponse.data.data.expertImagePath,
                  sebiRegNo: expertResponse.data.data.sebiRegNo,
                  email: user.username,
                  channelName: expertResponse.data.data.channelName,
                  subscriptionType: expertResponse.data.data.expertTypeId,
                  expertsId: user.id,
                };
              }
              return null;
            })
          );
          setContacts(fetchedContacts.filter((contact) => contact !== null));
        }
      } catch (error) {
        console.error("Error fetching contacts:", error);
      } finally {
        setLoadingContacts(false);
      }
    };

    const fetchExpertAndSelect = async (expertId) => {
      try {
        setShowFreePlanPopup(false);
        setShowPremiumPlanPopup(false);
        const expertResponse = await axios.get(
          `https://copartners.in:5132/api/Experts/${expertId}`
        );
        if (expertResponse.data.isSuccess) {
          const expertData = expertResponse.data.data;
          const contact = {
            name: expertData.name,
            img: expertData.expertImagePath,
            sebiRegNo: expertData.sebiRegNo,
            email: expertData.email,
            channelName: expertData.channelName,
            subscriptionType: expertData.expertTypeId,
            expertsId: expertId,
          };
          setSelectedContact(contact);
          startConnection(potentialUsername, contact.email);
          fetchTimespan(potentialUserId, expertId);
          fetchPlans(potentialUserId, expertId);
        }
      } catch (error) {
        console.error("Error fetching expert data:", error);
      }
    };

    const fetchTimespan = async (userId, expertId) => {
      setLoading(true);
      try {
        const response = await axios.get(
          `https://copartners.in:5137/api/ChatConfiguration/GetChatAvailUser/${userId}`
        );
        if (response.data.isSuccess) {
          const plans = response.data.data.filter(
            (plan) => plan.expertsId === expertId
          );
          if (plans.length > 0) {
            const latestPlan = plans.reduce((latest, plan) => {
              const planEndTime = new Date(plan.endTime);
              return planEndTime > new Date(latest.endTime) ? plan : latest;
            }, plans[0]);

            const now = new Date();
            const endTime = new Date(latestPlan.endTime);
            const timeRemaining = endTime - now;

            if (timeRemaining > 0) {
              setExpertsData((prevData) => ({
                ...prevData,
                [expertId]: {
                  ...prevData[expertId],
                  latestTimespan: {
                    start: latestPlan.startTime,
                    end: latestPlan.endTime,
                  },
                  timer: timeRemaining / 1000,
                },
              }));
              sessionStorage.setItem(`timer_${expertId}`, timeRemaining / 1000);
              sessionStorage.setItem(
                `timespan_${expertId}`,
                JSON.stringify({
                  start: latestPlan.startTime,
                  end: latestPlan.endTime,
                })
              );
            } else {
              handleExpiredTimer(expertId);
            }
          } else {
            handleExpiredTimer(expertId);
          }
        }
      } catch (error) {
        console.error("Error fetching timespan:", error);
      } finally {
        setLoading(false);
      }
    };

    // const fetchPlans = async (userId, expertId) => {
    //   try {
    //     const chatAvailResponse = await axios.get(`https://copartners.in:5137/api/ChatConfiguration/GetChatAvailUser/${userId}`);
    //     if (chatAvailResponse.data.isSuccess) {
    //       const chatAvailPlans = chatAvailResponse.data.data; // Used plans from GetChatAvailUser

    //       const usedFreePlansForThisExpert = chatAvailPlans.filter(plan => plan.planType === 'F' && plan.expertsId === expertId);
    //       const hasUsedDWithAnyExpert = chatAvailPlans.some(plan => plan.planType === 'D'); // Global "D" check

    //       if (!hasUsedDWithAnyExpert) {
    //         setShowFreePlanPopup(false);
    //         setShowPremiumPlanPopup(false);
    //         return;
    //       }

    //       const expertPlansResponse = await axios.get(`https://copartners.in:5137/api/ChatConfiguration/GetChatPlanByExpertsId/${expertId}?page=1&pageSize=10`);
    //       if (expertPlansResponse.data.isSuccess) {
    //         const expertPlans = expertPlansResponse.data.data;
    //         const availableFreePlans = expertPlans.filter(plan => plan.planType === 'F');
    //         const premiumPlans = expertPlans.filter(plan => plan.planType === 'P');
    //         setPremiumPlans(premiumPlans);

    //         const allFreePlansUsed = availableFreePlans.every(freePlan =>
    //           usedFreePlansForThisExpert.some(usedPlan => usedPlan.chatPlanId === freePlan.id)
    //         );

    //         const isTimerRunning = sessionStorage.getItem(`timer_${expertId}`);

    //         if (allFreePlansUsed && premiumPlans.length > 0 && !isTimerRunning) {
    //           setShowPremiumPlanPopup(true);
    //           setShowFreePlanPopup(false);
    //         } else if (!allFreePlansUsed && !isTimerRunning) {
    //           const nextUnusedFreePlan = availableFreePlans.find(freePlan =>
    //             !usedFreePlansForThisExpert.some(usedPlan => usedPlan.chatPlanId === freePlan.id)
    //           );
    //           if (nextUnusedFreePlan) {
    //             setFreePlanDuration(nextUnusedFreePlan.duration);
    //             setPlanId(nextUnusedFreePlan.id);
    //             setShowFreePlanPopup(true);
    //             setShowPremiumPlanPopup(false);
    //           }
    //         }
    //       }
    //     }
    //   } catch (error) {
    //     console.error('Error fetching plans:', error);
    //   }
    // };

    fetchUserImage();
    fetchContacts().then(() => {
      if (expertIdFromPath) {
        fetchExpertAndSelect(expertIdFromPath);
      }
    });

    const checkPlanTypeD = async () => {
      try {
        const response = await axios.get(
          `https://copartners.in:5137/api/ChatConfiguration/GetChatAvailUser/${potentialUserId}`
        );
        if (response.data.isSuccess) {
          const hasUsedD = response.data.data.some(
            (plan) => plan.planType === "D"
          );
          if (hasUsedD) {
            setHasUsedPlanD(true);
          }
        }
      } catch (error) {
        console.error("Error checking PlanType D:", error);
      }
    };

    checkPlanTypeD();
  }, [location.pathname]);

  useEffect(() => {
    let intervalId;
    let startTime = Date.now();
  
    const checkAndRefresh = () => {
      if (expertsData[currentExpertId]?.timer > 0) {
        const elapsedTime = (Date.now() - startTime) / 1000;
        const newTimer = expertsData[currentExpertId].timer - elapsedTime;
  
        if (newTimer <= 0) {
          handleExpiredTimer(currentExpertId); // Expired timer handling
        } else {
          setExpertsData((prevData) => ({
            ...prevData,
            [currentExpertId]: {
              ...prevData[currentExpertId],
              timer: newTimer,
            },
          }));
          startTime = Date.now();
        }
      }
    };
  
    // Handle tab visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // When tab becomes visible, just refresh the timer if it hasn't expired
        if (expertsData[currentExpertId]?.timer > 0) {
          checkAndRefresh(); // Simply continue the timer without resetting or reloading
        }
      }
    };

    intervalId = setInterval(checkAndRefresh, 1000);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [expertsData, currentExpertId]);

  const startConnection = async (username, receiver) => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(
        `https://copartners.in:5137/chathub?username=${encodeURIComponent(
          username
        )}&chatPartnerUsername=${encodeURIComponent(receiver)}`
      )
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

        // Listen for 'UpdateOnlineUsers' event to get the list of online users
  connection.on('UpdateOnlineUsers', function(onlineUsers) {
    console.log('Online users:', onlineUsers); // Log the list of online users
    // Optionally update UI to display online status if required
  });

  connection.on(
    "ReceiveMessage",
    (
      user, // The expert (sender) of the message
      message,
      receivedPlanType,
      planId,
      paidPlanId,
      startDateTime,
      endDateTime
    ) => {
      // Check if the message is for the currently selected expert
      if (selectedContact && selectedContact.email === user) {
        // Message is for the selected expert, process it
        if (message !== "1" && message !== "20") {
          const newMessage = {
            user,
            message,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            planType: receivedPlanType,
            planId,
            paidPlanId,
            startDateTime: new Date(startDateTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            endDateTime: new Date(endDateTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
  
          // Display toast notification for the selected expert
          toast.info(`New message from ${selectedContact.name}: ${message}`, {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
  
          // Add the message to the chat of the currently selected expert
          setMessages((prevMessages) => [...prevMessages, newMessage]);
          setConversations((prevConversations) => ({
            ...prevConversations,
            [user]: [
              ...(prevConversations[user] || []),
              {
                sender: user,
                text: message,
                timestamp: new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              },
            ],
          }));
        }
  
        // Update session storage and timers for the currently selected expert
        if (user === currentExpertId) {
          const timespan = {
            start: startDateTime,
            end: endDateTime,
          };
          sessionStorage.setItem(
            `timespan_${currentExpertId}`,
            JSON.stringify(timespan)
          );
  
          const endTime = new Date(endDateTime);
          const remainingTime = endTime - new Date(); // Calculate remaining time
          setExpertsData((prevData) => ({
            ...prevData,
            [currentExpertId]: {
              ...prevData[currentExpertId],
              timer: remainingTime > 0 ? remainingTime / 1000 : 0,
              latestTimespan: timespan,
            },
          }));
          sessionStorage.setItem(
            `timer_${currentExpertId}`,
            remainingTime > 0 ? remainingTime / 1000 : 0
          );
          sessionStorage.setItem(`planType_${currentExpertId}`, receivedPlanType);
        }
      } else {
        // If the message is not for the current expert, ignore it
        console.log(
          `Message from ${user} is not for the selected expert ${selectedContact?.email}`
        );
      }
    }
  );
  

    connection.on("LoadPreviousMessages", (messages) => {
      const filteredMessages = messages.filter(
        (msg) => msg.content !== "1" && msg.content !== "20"
      );
      const formattedMessages = filteredMessages.map((message) => ({
        user: message.sender,
        message: message.content,
        timestamp: new Date(message.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));

      setMessages(formattedMessages);
      setConversations((prevConversations) => {
        const updatedConversations = { ...prevConversations };
        formattedMessages.forEach((msg) => {
          if (!updatedConversations[msg.user]) {
            updatedConversations[msg.user] = [];
          }
          updatedConversations[msg.user].push({
            sender: msg.user,
            text: msg.message,
            timestamp: msg.timestamp,
          });
        });
        return updatedConversations;
      });
      setLoading(false);
    });

    connection.onreconnecting(() => {
      setConnectionStatus("Reconnecting...");
    });

    connection.onreconnected(() => {
      setConnectionStatus("Connected!");
    });

    connection.onclose(async () => {
      setConnectionStatus("Disconnected. Reconnecting...");
      setTimeout(() => startConnection(username, receiver), 5000);
    });

    try {
      await connection.start();
      setConnectionStatus("Connected!");
      connectionRef.current = connection;
    } catch (err) {
      setConnectionStatus("Connection failed.");
      setTimeout(() => startConnection(username, receiver), 5000);
    }
  };

  const fetchPlanDetails = async () => {
    try {
      const storedUserId = sessionStorage.getItem("userId");
      const response = await axios.get(
        `https://copartners.in:5137/api/ChatConfiguration/GetChatAvailUser/${storedUserId}`
      );
      if (response.data.isSuccess) {
        setPlanDetails(response.data.data);
        setShowPlanPopup(true);
      }
    } catch (error) {
      console.error("Error fetching plan details:", error);
    }
  };

const handleSendMessage = async (message) => {
  const receiver = selectedContact.email;

  let currentPlanId = planId || sessionStorage.getItem(`planId_${expertId}`);
  let currentPaidPlanId = paidPlanId || sessionStorage.getItem(`paidPlanId_${expertId}`);
  const storedUserId = sessionStorage.getItem("userId");

  if (!storedUserId) {
    console.error("UserId is missing!");
    return;
  }

  // Check if the expert has a pending plan and use the pending planType if applicable
  const pendingPlanType = sessionStorage.getItem(`pending_planType_${expertId}`);

  if (pendingPlanType) {
    console.log(`Using pending planType: ${pendingPlanType}`);
  }

  const activePlanType = expertsData[expertId]?.planType || pendingPlanType; // Use the pending planType if available

  // Generate a new paidPlanId using uuidv4 if it's not available
  if (!currentPaidPlanId) {
    currentPaidPlanId = uuidv4(); // Generate unique ID
    sessionStorage.setItem(`paidPlanId_${expertId}`, currentPaidPlanId);
  }

  if (
    connectionRef.current &&
    connectionRef.current.state === signalR.HubConnectionState.Connected
  ) {
    try {
      if (activePlanType === "D") {
        currentPlanId = storedUserId;
        currentPaidPlanId = storedUserId; // Use userId for both if planType is "D"
      }

      console.log(`Sending message: ${message.text} to ${receiver}`);
      console.log(`PlanType: ${activePlanType}, PlanId: ${currentPlanId}, PaidPlanId: ${currentPaidPlanId}`);

      await connectionRef.current.invoke(
        "SendMessage",
        username,
        receiver,
        message.text,
        activePlanType, // Send the correct planType, including pending planType
        currentPlanId,
        currentPaidPlanId // Send the generated or retrieved paidPlanId
      );

      const newMessage = {
        user: username,
        message: message.text,
        receiver: receiver,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        planType: activePlanType, // Store the correct planType in the message
        planId: currentPlanId,
        paidPlanId: currentPaidPlanId,
      };
      console.log("Message sent successfully:", newMessage);

      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setConversations((prevConversations) => ({
        ...prevConversations,
        [receiver]: [...(prevConversations[receiver] || []), newMessage],
      }));
    } catch (err) {
      // Log the error to the console before showing the error
      console.error("Error details:", {
        receiver,
        message: message.text,
        planType: activePlanType,
        currentPlanId,
        currentPaidPlanId,
      });
      console.error("Error sending message:", err.toString());
    }
  } else {
    setConnectionStatus("Not connected. Please try again.");
  }
};


  const handleSelectPlan = (duration, id, selectedPlanType) => {
    setExpertsData((prevData) => ({
      ...prevData,
      [currentExpertId]: {
        ...prevData[currentExpertId],
        planType: selectedPlanType,
      },
    }));

    if (selectedPlanType === "D") {
      const storedUserId = sessionStorage.getItem("userId");
      setPlanId(storedUserId);
      setPaidPlanId(storedUserId);
      sessionStorage.setItem(`planId_${currentExpertId}`, storedUserId);
      sessionStorage.setItem(`paidPlanId_${currentExpertId}`, storedUserId);
    } else if (selectedPlanType === "F") {
      // Handle FreePlan selection
      setPlanId(id);
      setPaidPlanId(id);
      sessionStorage.setItem(`planId_${currentExpertId}`, id);
      sessionStorage.setItem(`paidPlanId_${currentExpertId}`, id);
    } else if (selectedPlanType === "P") {
      setPlanId(id);
      const newPaidPlanId = uuidv4();
      setPaidPlanId(newPaidPlanId);
      sessionStorage.setItem(`planId_${currentExpertId}`, id);
      sessionStorage.setItem(`paidPlanId_${currentExpertId}`, newPaidPlanId);
    }

    sessionStorage.setItem(`planType_${currentExpertId}`, selectedPlanType);

    // **Reset first reply received state to trigger refresh for the next expert reply**
    setIsFirstReplyReceived(false);
    sessionStorage.removeItem(`firstReplyReceived_${currentExpertId}`); // Clear the sessionStorage flag for first reply
  };

  const selectUser = async (contact) => {
    setMessages(conversations[contact.email] || []);
    setLoading(true);
    setExpertId(contact.expertsId);
    setCurrentExpertId(contact.expertsId);
    sessionStorage.setItem("expertId", contact.expertsId);

    startConnection(username, contact.email);
    setSelectedContact(contact);
    setUnreadMessages((prevUnread) => ({
      ...prevUnread,
      [contact.email]: 0,
    }));

    // Reset popup states on expert change
    setShowFreePlanPopup(false);
    setShowPremiumPlanPopup(false);

    // Fetch plans and decide if popups should be shown
    // fetchPlans(userId, contact.expertsId);
  };

  useEffect(() => {
    if (expertsData[currentExpertId]?.latestTimespan) {
      sessionStorage.setItem(
        `latestTimespan_${expertId}`,
        JSON.stringify(expertsData[currentExpertId].latestTimespan)
      );
    }

    if (expertsData[currentExpertId]?.timer !== null) {
      sessionStorage.setItem(
        `timer_${expertId}`,
        expertsData[currentExpertId]?.timer
      );
      sessionStorage.setItem("isTimerRunning", "true");
    } else {
      sessionStorage.removeItem("isTimerRunning");
    }
  }, [expertsData, expertId, currentExpertId]);

  const handleBack = () => {
    goBackToChatList();
  };

  useEffect(() => {
    if (
      expertsData[currentExpertId]?.latestTimespan &&
      expertsData[currentExpertId]?.timer !== null
    ) {
      const now = new Date();
      const endTime = new Date(expertsData[currentExpertId].latestTimespan.end);
      const timeRemaining = endTime - now;
      if (timeRemaining > 0) {
        setExpertsData((prevData) => ({
          ...prevData,
          [currentExpertId]: {
            ...prevData[currentExpertId],
            timer: timeRemaining / 1000,
          },
        }));
      } else {
        handleExpiredTimer(currentExpertId);
      }
    }
  }, [selectedContact, expertsData[expertId]?.timer]);

  const onShowPlanDetails = () => {
    fetchPlanDetails();
  };

  return (
    <div className="flex h-screen">
      <div
        className={`flex-col w-full md:w-1/3 bg-[#18181B] text-white overflow-y-auto ${
          selectedContact ? "hidden md:flex" : "flex"
        }`}
      >
        <ChatList
          contacts={contacts}
          onSelectContact={selectUser}
          conversations={conversations}
          unreadMessages={unreadMessages}
          loading={loadingContacts}
          setPlanType={(expertId, planType) =>
            setExpertsData((prev) => ({
              ...prev,
              [expertId]: { ...prev[expertId], planType },
            }))
          }
          setLatestTimespan={(expertId, latestTimespan) =>
            setExpertsData((prev) => ({
              ...prev,
              [expertId]: { ...prev[expertId], latestTimespan },
            }))
          }
        />
      </div>
      <div
        className={`flex-col w-full bg-[#06030E] md:w-2/3 ${
          selectedContact ? "flex" : "hidden md:flex"
        } border-l-[1px] border-[#ffffff48]`}
      >
        <AnimatePresence>
          {selectedContact ? (
            <ChatArea
              key={expertId}
              username={username}
              userImage={userImage}
              selectedContact={selectedContact}
              messages={messages}
              onSendMessage={handleSendMessage}
              onBack={handleBack}
              loading={loading}
              expertId={expertId}
              connectionStatus={connectionStatus}
              startEndTime={expertsData[expertId]?.latestTimespan}
              onShowPlanDetails={onShowPlanDetails}
              timer={expertsData[expertId]?.timer}
              showFreePlanPopup={showFreePlanPopup}
              showPremiumPlanPopup={showPremiumPlanPopup}
              freePlanDuration={freePlanDuration}
              premiumPlans={premiumPlans}
              handleSelectPlan={handleSelectPlan}
              closePlanPopups={closePlanPopups}
            />
          ) : (
            <motion.div
              key="logo"
              className="flex justify-center items-center h-full bg-[#f0f0f0]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <img src={logo} alt="Logo" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {showPlanPopup && (
        <PlanPopup
          planDetails={planDetails}
          userId={userId}
          expertId={expertId}
          onClose={() => setShowPlanPopup(false)}
          hasUsedD={hasUsedPlanD}
        />
      )}
      {showFreePlanPopup && freePlanDuration && (
        <FreePlanPopup
          freePlan={{ duration: freePlanDuration, id: planId }}
          onSelectPlan={handleSelectPlan}
          onClose={() => setShowFreePlanPopup(false)}
          onBackToChatList={goBackToChatList}
        />
      )}
      {showPremiumPlanPopup && premiumPlans.length > 0 && (
        <PremiumPlanPopup
          plans={premiumPlans}
          onSelectPlan={handleSelectPlan}
          onOpenPayment={handleOpenPaymentPopup} // Pass the handler to open payment modal
          onClose={closePlanPopups}
          onBackToChatList={goBackToChatList}
        />
      )}
       {showSubscriptionPopup && (
       <SubscriptionMinorPopup
       selectedPlan={selectedPlan}
       onClose={handleClosePaymentPopup}
       userId={userId}
       mobileNumber={username}
       expertName={selectedContact?.name} // Pass the expert's name
       onBackToChatList={goBackToChatList}
       setShowSubscriptionPopup={setShowSubscriptionPopup}
       setExpertsData={setExpertsData} // Pass setExpertsData
       currentExpertId={currentExpertId} // Pass currentExpertId
       handleSendMessage={handleSendMessage} // Pass handleSendMessage
     />
     
      )} 
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default ChatApp;
