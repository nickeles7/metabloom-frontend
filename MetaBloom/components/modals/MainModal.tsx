import { useMainModal } from "@/stores/modal";
import React, { useEffect, useRef } from "react";
import { PiX } from "react-icons/pi";
import BotDetailsModal from "./BotDetailsModal";
import SupportModal from "./SupportModal";
import ShareViedeoModal from "./ShareViedeoModal";
import ShareImageModal from "./ShareImageModal";
import AdjustPhotoModal from "./AdjustPhotoModal";
import ShareRetouchImageModal from "./ShareRetouchImageModal";
import AudioCreationModal from "./AudioCreationModal";
import EditProfileModal from "./EditYourProfile";
import MyDecksModal from "./MyDecksModal";
import SettingsModal from "./SettingsModal";
import UpgradeModal from "./UpgradeModal";
import DowngradeConfirmationModal from "./DowngradeConfirmationModal";
import CancelSubscriptionModal from "./CancelSubscriptionModal";
import NotificationModal from "./NotificationModal";
import ShareLinkModal from "./ShareLinkModal";
import CreateNewModal from "./CreateNewModal";
import TokenPurchaseModal from "./TokenPurchaseModal";
import ShareCodeModal from "./ShareCodeModal";
import SearchModal from "./SearchModal";
import CustomDetailsModal from "./CustomDetailsModal";
import EditBotModal from "./EditBotModal";
import PerformanceModal from "./PerformanceModal";
import UploadToAIQuill from "./UploadToAIQuill";
import AuthModal from "./AuthModal";

function MainModal() {
  const { show, modalName, modalParams, modalClose } = useMainModal();
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        // Add a small delay to prevent animation conflicts
        requestAnimationFrame(() => {
          modalClose();
        });
      }
    };

    if (show) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [show, modalClose]);

  return (
    <div
      className={`bg-black fixed inset-0 bg-opacity-40 z-[99] flex   ${
        show
          ? " scale-100 opacity-100 visible translate-y-0"
          : " scale-95 opacity-0 invisible -translate-y-2"
      } duration-300 ease-out  ${
        modalName === "Upgrade"
          ? "justify-end items-start overflow-auto"
          : "justify-center items-center px-4 sm:px-6"
      }`}
    >
      <div
        ref={modalRef}
        className={`bg-white dark:bg-n0 rounded-xl w-full ${
          modalName === "Upgrade"
            ? "overflow-hidden sm:w-[600px]"
            : modalName === "DowngradeConfirmation"
            ? "p-4 sm:p-6 overflow-y-auto max-w-[420px] max-h-[90vh]"
            : modalName === "Notification"
            ? "p-4 sm:p-6 overflow-y-auto max-w-[400px] max-h-[90vh]"
            : modalName === "Support Modal"
            ? "p-4 sm:p-6 overflow-y-auto max-w-[1067px] max-h-[90vh]"
            : modalName === "Authentication"
            ? "p-4 sm:p-6 overflow-y-auto max-w-[500px] max-h-[90vh]"
            : modalName === "Token Purchase"
            ? "p-3 sm:p-4 overflow-y-auto max-w-[480px] max-h-[90vh]"
            : "p-4 sm:p-6 overflow-y-auto max-w-[900px] max-h-[90vh]"
        }`}
      >
        {modalName !== "Upgrade" &&
         modalName !== "DowngradeConfirmation" &&
         modalName !== "CancelSubscription" &&
         modalName !== "Notification" &&
         modalName !== "Token Purchase" &&
         modalName !== "My Decks" &&
         modalName !== "Support Modal" && (
          <div className="flex justify-between items-center pb-6 mb-6 border-b border-primaryColor/30">
            <p className="font-medium ">{modalName}</p>
            <button onClick={modalClose}>
              <PiX className="text-xl" />
            </button>
          </div>
        )}
        {modalName === "Token Purchase" && (
          <div className="flex justify-end items-center pb-2 mb-2">
            <button onClick={modalClose}>
              <PiX className="text-xl" />
            </button>
          </div>
        )}
        {modalName === "My Decks" && (
          <div className="flex justify-end items-center pb-2 mb-2">
            <button onClick={modalClose}>
              <PiX className="text-xl" />
            </button>
          </div>
        )}
        {modalName === "Support Modal" && (
          <div className="flex justify-end items-center pb-2 mb-2">
            <button onClick={modalClose}>
              <PiX className="text-xl" />
            </button>
          </div>
        )}
        {modalName === "Bot Details Modal" && <BotDetailsModal />}
        {modalName === "Support Modal" && <SupportModal />}
        {modalName === "Upload To Bot Ai" && <UploadToAIQuill />}
        {modalName === "Share Video" && <ShareViedeoModal />}
        {modalName === "Share Image" && <ShareImageModal />}
        {modalName === "Adjust Photo" && <AdjustPhotoModal />}
        {modalName === "Share Retouch Image" && <ShareRetouchImageModal />}
        {modalName === "Audio Creation" && <AudioCreationModal />}
        {modalName === "Edit Profile" && <EditProfileModal />}
        {modalName === "My Decks" && <MyDecksModal />}
        {modalName === "Settings" && <SettingsModal />}
        {modalName === "Upgrade" && <UpgradeModal />}
        {modalName === "DowngradeConfirmation" && <DowngradeConfirmationModal />}
        {modalName === "CancelSubscription" && <CancelSubscriptionModal />}
        {modalName === "Notification" && <NotificationModal />}
        {modalName === "Share Public Link" && <ShareLinkModal />}
        {modalName === "Create New Bot" && <CreateNewModal />}
        {modalName === "Share Code" && <ShareCodeModal />}
        {modalName === "Search" && <SearchModal />}
        {modalName === "Custom Bot Details" && <CustomDetailsModal />}
        {modalName === "Edit Your Bot" && <EditBotModal />}
        {modalName === "Performance" && <PerformanceModal />}
        {modalName === "Authentication" && <AuthModal mode={modalParams.mode || "signin"} />}
        {modalName === "Token Purchase" && <TokenPurchaseModal />}
      </div>
    </div>
  );
}

export default MainModal;
