import React, { useState } from "react";
import { IoCloseCircleOutline } from "react-icons/io5";

const SubscriptionMinorPopup = ({
  onClose,
  selectedPlan,
  userId,
  expertName,
  mobileNumber,
  onBackToChatList,
  setShowSubscriptionPopup,
  setExpertsData,   // Accept setExpertsData as a prop
  currentExpertId,  // Accept currentExpertId as a prop
  handleSendMessage // Accept handleSendMessage as a prop
}) => {
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const handlePay = async () => {
    setLoading(true);
    console.log(selectedPlan);

    const res = await loadRazorpayScript();

    if (!res) {
      alert("Razorpay SDK failed to load. Are you online?");
      setLoading(false); // Re-enable the button if there's an error
      return;
    }

    // Create chatSubscriberCreateDto object
    const chatSubscriberCreateDto = {
      chatPlanId: selectedPlan.id, 
      userId: userId, 
      gstAmount: selectedPlan.price * 0.18,
      totalAmount: selectedPlan.price, 
      discountPercentage: selectedPlan.discountPercentage || 0, 
      paymentMode: "UPI",
      transactionId: `T${Date.now()}`, 
      transactionDate: new Date().toISOString(), 
      isActive: true, 
      invoiceId :"",
      paymentId: "",
      isWebhookProcessed: false,
    };

    // Fetch to create order
    fetch(
      `https://copartners.in:5137/api/PaymentGateway/create-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chatSubscriberCreateDto),
      }
    )
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }

      const options = {
        key: "rzp_live_D2N1nZHECBBkuW",
        amount: data.amountInPaise, 
        currency: "INR",
        name: expertName, 
        description: `Chat`,
        order_id: data.orderId, 
        handler: function (response) {
          console.log("Payment response:", response);
          capturePayment(response.razorpay_payment_id, data.orderId);
        },
        prefill: {
          name: "John Doe", 
          email: "john.doe@example.com", 
          contact: mobileNumber,
        },
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.open();
    })
    .catch((error) => {
      console.error("Error creating order:", error);
      alert("Order creation failed");
    })
    .finally(() => {
      setLoading(false);
    });
  };

  const capturePayment = (paymentId, orderId) => {
    const amount = selectedPlan.price;

    const subscriberCreateDto = {
      chatPlanId: selectedPlan.id,
      userId: userId,
      gstAmount: selectedPlan.price * 0.18, 
      totalAmount: amount,
      discountPercentage: selectedPlan.discountPercentage || 0, 
      paymentMode: "UPI",
      transactionId: `T${Date.now()}`,
      transactionDate: new Date().toISOString(), 
      isActive: true,
      invoiceId :"",
      paymentId: paymentId,
      isWebhookProcessed: false,
    };

    fetch(
      `https://copartners.in:5137/api/PaymentGateway/capture-payment?paymentId=${paymentId}&amount=${amount}&orderId=${orderId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscriberCreateDto),
      }
    )
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        // **Update planType, planId, and paidPlanId only after successful payment**
        setExpertsData((prevData) => ({
          ...prevData,
          [currentExpertId]: {
            ...prevData[currentExpertId],
            planType: 'P', // Change as per selected plan
            planId: selectedPlan.id,
            paidPlanId: paymentId,
          }
        }));

        // **Send automatic message to the expert**
        handleSendMessage({
          text: "User has bought your plan",
        });

        window.location.reload(); // Redirect to success page if required
      } else {
        alert(`Error: ${data.message}`);
      }
    })
    .catch((error) => {
      console.error("Error capturing payment:", error);
      alert("Payment capture failed");
    });
  };

  const handleClosePopups = () => {
    setShowSubscriptionPopup(false);
    onBackToChatList()
  }

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-40">
        <div className="bg-white border-2 border-dashed border-black rounded-xl shadow-md md:w-[380px] w-[90%] relative">
          <div className="p-6">
            <button
              onClick={() => handleClosePopups()}
              className="absolute top-8 right-4 text-gray-500 hover:text-gray-700"
            >
              <IoCloseCircleOutline className="w-6 h-6" />
            </button>

            <h2 className="md:text-2xl text-xl font-bold text-black text-left mb-4">
              Confirm Your Subscription
            </h2>

            <div className="bg-gray-100 p-4 rounded-lg mb-4">
              <div className="flex justify-between mb-2">
                <label className="block text-sm text-gray-500 font-normal">
                  Subscription Plan
                </label>
                <span className="text-sm text-black">
                  {selectedPlan.planName}
                </span>
              </div>
              <div className="flex justify-between mb-2">
                <label className="block text-sm text-gray-500 font-normal">
                  Amount
                </label>
                <span className="text-sm text-black">
                  ₹{selectedPlan.price}
                </span>
              </div>
            </div>

            <button
              className={`w-full bg-gradient-to-r text-white py-3 rounded-lg font-semibold text-lg hover:opacity-90 transition duration-300 ${
                loading
                  ? "opacity-50 from-blue-800 to-purple-800 cursor-not-allowed"
                  : "from-blue-500 to-purple-500"
              }`}
              onClick={handlePay}
              disabled={loading}
            >
              {loading ? "Processing..." : "Proceed to Pay"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SubscriptionMinorPopup;
