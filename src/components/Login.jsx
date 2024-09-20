import React, { useState, useEffect, useRef } from "react";
import { FiX } from "react-icons/fi";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { logo } from "../assets";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // For redirecting the user

const LoginPopup = ({ onClose }) => {
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false); // Loading state for API calls
  const [chatLoading, setChatLoading] = useState(false); // Loading state for Chat User API
  const [step, setStep] = useState("enterMobile"); // Step to control the form state
  const [otpTimer, setOtpTimer] = useState(60); // Timer for resending OTP
  const [isOtpResendAllowed, setIsOtpResendAllowed] = useState(false); // Controls when resend OTP is clickable
  const inputRef = useRef(null);
  const countryCode = "IN"; // Fixed country code
  const navigate = useNavigate(); // For navigation after successful login

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [step]);

  const handleMobileChange = (e) => {
    setMobile(e.target.value);
  };

  const handleOtpChange = (e) => {
    setOtp(e.target.value);
  };

  const handleGenerateOtp = async () => {
    if (mobile.length !== 10) {
      toast.error("Mobile number should have exactly 10 digits.");
      return;
    }

    try {
      setLoading(true); // Start loading
      const response = await axios.post("https://copartners.in:5181/api/SignIn/GenerateOTP", {
        countryCode,
        mobileNumber: mobile,
        otp: "",
      });

      if (response.status === 200) {
        toast.success("OTP sent successfully!");
        setStep("enterOtp");
        startOtpTimer();
      } else {
        toast.error("Failed to generate OTP. Please try again.");
      }
    } catch (error) {
      toast.error("Error generating OTP. Please try again.");
    } finally {
      setLoading(false); // End loading
    }
  };

  const handleValidateOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP.");
      return;
    }

    try {
      setLoading(true); // Start loading
      const response = await axios.post("https://copartners.in:5181/api/SignIn/ValidateOTP", {
        countryCode,
        mobileNumber: mobile,
        otp,
      });

      if (response.status === 200 && response.data.isSuccess) {
        toast.success("OTP verified successfully!");
        await handlePostUser(); // Post user data after successful OTP validation
      } else {
        toast.error("Invalid OTP. Please try again.");
      }
    } catch (error) {
      toast.error("Error validating OTP. Please try again.");
    } finally {
      setLoading(false); // End loading
    }
  };

  const handlePostUser = async () => {
    const userData = {
      name: "",
      userImagePath: "",
      email: "",
      mobileNumber: mobile,
      isKYC: true,
      pan: "",
      address: "",
      state: "",
      referralCode: "",
      affiliatePartnerId: "",
      referralMode: "CP", // Set referral mode as 'CP'
      expertsID: "",
      advertisingAgencyId: "",
      expertsAdvertisingAgencyId: "",
      landingPageUrl: ""
    };

    try {
      setLoading(true); // Start loading
      const response = await axios.post("https://copartners.in:5131/api/User", userData);

      if (response.data.isSuccess) {
        const userId = response.data.data.id;
        toast.success("Login successful! Redirecting...");
        await postChatUser(userId, mobile); // Call to chat API after login
        redirectToChat(userId, mobile);
      } else if (response.data.errorMessages.includes("User already exists for given mobile and email.")) {
        // Handle the case where the user already exists
        const userId = response.data.data.id; // Extract the user ID even if user already exists
        toast.info("User already exists, proceeding to the chat.");
        await postChatUser(userId, mobile); // Call to chat API even if user already exists
        redirectToChat(userId, mobile); // Proceed with redirection
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
    } catch (error) {
      // If error occurs but contains data (such as the user already existing)
      if (error.response && error.response.data && error.response.data.data) {
        const userId = error.response.data.data.id;
        toast.info("User exists, redirecting to the chat.");
        await postChatUser(userId, mobile); // Call to chat API even on error
        redirectToChat(userId, mobile); // Proceed with redirection even on error
      } else {
        toast.error("Error posting user data. Please try again.");
      }
    } finally {
      setLoading(false); // End loading
    }
  };

  const postChatUser = async (userId, mobileNumber) => {
    const payload = {
      id: userId,
      userType: 'UR',
      username: mobileNumber,
    };

    try {
      setChatLoading(true); // Start loading for chat API
      const response = await axios.post('https://copartners.in:5137/api/ChatConfiguration/PostChatUser', payload);
      toast.success("Chat user configuration successful.");
    } catch (postError) {
      if (postError.response && postError.response.data.errorMessage === "Record already exists") {
        toast.info("Chat record already exists.");
      } else {
        toast.error("Error configuring chat user.");
      }
    } finally {
      setChatLoading(false); // End loading for chat API
    }
  };

  const redirectToChat = (userId, mobileNumber) => {
    // Navigate to chat application with userId and mobile as parameters
    navigate(`/${userId}/${mobileNumber}`);
    window.location.reload(); // Refresh the page after navigation to ensure the URL parameters are used
  };

  const handleResendOtp = async () => {
    if (!isOtpResendAllowed) return;

    try {
      setLoading(true); // Start loading
      const response = await axios.post("https://copartners.in:5181/api/SignIn/GenerateOTP", {
        countryCode,
        mobileNumber: mobile,
        otp: "",
      });

      if (response.status === 200) {
        toast.success("OTP resent successfully!");
        startOtpTimer();
      } else {
        toast.error("Failed to resend OTP. Please try again.");
      }
    } catch (error) {
      toast.error("Error resending OTP. Please try again.");
    } finally {
      setLoading(false); // End loading
    }
  };

  const startOtpTimer = () => {
    setIsOtpResendAllowed(false);
    setOtpTimer(60);
    const timerInterval = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev === 1) {
          clearInterval(timerInterval);
          setIsOtpResendAllowed(true);
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 w-screen h-screen">
        <div className="bg-white border-2 border-dashed border-black p-8 rounded-xl w-96 relative shadow-lg">
          {/* <div className="absolute top-3 right-3">
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition duration-200"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div> */}

          <div className="mb-6 text-center">
            <h2 className="text-3xl font-semibold text-gray-800">
              Login/Sign Up
            </h2>
          </div>
          <p className="text-gray-600 mb-4 text-center">
            Please enter your mobile number to continue.
          </p>

          <div className="pb-6">
            <div className="mb-4">
              <input
                ref={inputRef}
                type="number"
                className={`w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-150 ${
                  step === "enterOtp" ? "bg-gray-100" : ""
                }`}
                placeholder="Enter Your Mobile Number"
                value={mobile}
                onChange={handleMobileChange}
                maxLength={10}
                disabled={step === "enterOtp"} 
              />
            </div>

            {step === "enterOtp" && (
              <>
                <div className="mb-4">
                  <input
                    ref={inputRef}
                    type="number"
                    className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-150"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={handleOtpChange}
                    maxLength={6}
                  />
                </div>

                <button
                  onClick={handleValidateOtp}
                  className="w-full py-3 text-lg bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg shadow-md hover:from-purple-600 hover:to-indigo-600 transition-all duration-200"
                >
                  {loading || chatLoading ? "Processing..." : "Verify OTP"}
                </button>

                <div className="mt-4 text-center text-gray-600">
                  {isOtpResendAllowed ? (
                    <span
                      className="text-indigo-500 cursor-pointer"
                      onClick={handleResendOtp}
                    >
                      Didn't get OTP? Resend OTP
                    </span>
                  ) : (
                    <span>Resend OTP in {otpTimer}s</span>
                  )}
                </div>
              </>
            )}

            {step === "enterMobile" && (
              <button
                onClick={handleGenerateOtp}
                className="w-full py-3 text-lg bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg shadow-md hover:from-purple-600 hover:to-indigo-600 transition-all duration-200"
              >
                {loading ? "Sending..." : "Continue"}
              </button>
            )}
          </div>

          <div className="text-center flex flex-col items-center mt-4">
            <p className="text-gray-600 flex items-center justify-center">
              <span className="flex items-center">
                Not a member of{" "}
                <img src={logo} className="w-auto h-5 mx-1 mt-1" alt="Logo" />?
              </span>
              <a
                href="https://copartner.in"
                className="text-blue-600 hover:text-blue-700 font-semibold ml-2"
              >
                Sign Up
              </a>
            </p>
          </div>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </>
  );
};

export default LoginPopup;
