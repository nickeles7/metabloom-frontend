"use client";
import Link from "next/link";
import React from "react";
import {
  PiGear,
  PiQuestion,
  PiCards,
  PiRocket,
  PiSignOut,
  PiSignIn,
  PiUserPlus,
  PiUserCircle,
  PiCreditCard,
  PiUsers,
} from "react-icons/pi";
import useModalOpen from "@/hooks/useModalOpen";
import { useMainModal } from "@/stores/modal";
import { useAuth } from "@/stores/auth";
import { useAuth as useFirebaseAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useUserSubscription } from "@/hooks/useUserSubscription";

function UserModal() {
  const { modalOpen } = useMainModal();
  const { modal, setModal, modalRef } = useModalOpen();
  const { isAuthenticated, user, logout: storeLogout } = useAuth();
  const { logout } = useFirebaseAuth();
  const router = useRouter();
  const { currentPlan } = useUserSubscription();

  const handleSignIn = () => {
    modalOpen("Authentication", { mode: "signin" });
    setModal(false);
  };

  const handleSignUp = () => {
    modalOpen("Authentication", { mode: "signup" });
    setModal(false);
  };

  const handleLogout = async () => {
    try {
      // First logout from Firebase
      await logout();
      // Then update the store state
      storeLogout();
      // Close the modal
      setModal(false);
      // Redirect to homepage
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="relative size-9" ref={modalRef}>
      <button
        onClick={() => setModal((prev) => !prev)}
        className="w-full h-full flex items-center justify-center text-n500 dark:text-n30 hover:text-primaryColor transition-colors duration-200"
      >
        <PiUserCircle className="w-full h-full" />
      </button>
      <div
        className={`absolute top-12 right-0 bg-white dark:bg-n0 border border-primaryColor/30 p-3 rounded-xl text-sm duration-300 z-30 text-n500 dark:text-n30 w-[240px] ${
          modal
            ? "visible translate-y-0 opacity-100 "
            : "invisible translate-y-2 opacity-0"
        } `}
      >
        <ul className={`flex flex-col gap-1 justify-start items-start`}>
          {isAuthenticated ? (
            <>
              <li className="flex justify-start items-center gap-2 p-3 border-b border-primaryColor/30 cursor-pointer w-full">
                <PiUserCircle className="size-7 text-primaryColor" />
                <span className="">{user?.email || "MetaBloom User"}</span>
              </li>
              <li className="w-full">
                <Link
                  href={"/upgrade-plan"}
                  onClick={() => setModal(false)}
                  className="flex justify-start items-center gap-2 p-3 rounded-lg border border-transparent hover:border-primaryColor/30 hover:bg-primaryColor/5 duration-300 cursor-pointer w-full"
                >
                  <PiRocket className="text-xl" />
                  <span className="">{currentPlan === 'free' ? 'Upgrade Plan' : 'Manage Plan'}</span>
                </Link>
              </li>
              <li
                className="flex justify-start items-center gap-2 p-3 rounded-lg border border-transparent hover:border-primaryColor/30 hover:bg-primaryColor/5 duration-300 cursor-pointer w-full"
                onClick={() => {
                  modalOpen("Token Purchase");
                  setModal(false);
                }}
              >
                <PiCreditCard className="text-xl" />
                <span className="">Purchase Messages</span>
              </li>
              <li className="w-full">
                <Link
                  href={"/affiliate"}
                  onClick={() => setModal(false)}
                  className="flex justify-start items-center gap-2 p-3 rounded-lg border border-transparent hover:border-primaryColor/30 hover:bg-primaryColor/5 duration-300 cursor-pointer w-full"
                >
                  <PiUsers className="text-xl" />
                  <span className="">Affiliate Program</span>
                  {currentPlan !== 'premium' && (
                    <div className="ml-auto bg-gradient-to-r from-primaryColor to-blue-600 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                      Premium
                    </div>
                  )}
                </Link>
              </li>
              <li
                className="flex justify-start items-center gap-2 p-3 rounded-lg border border-transparent hover:border-primaryColor/30 hover:bg-primaryColor/5 duration-300 cursor-pointer w-full"
                onClick={() => {
                  modalOpen("My Decks");
                  setModal(false);
                }}
              >
                <PiCards className="text-xl" />
                <span className="">My Decks</span>
              </li>
              <li
                className="flex justify-start items-center gap-2 p-3 rounded-lg border border-transparent hover:border-primaryColor/30 hover:bg-primaryColor/5 duration-300 cursor-pointer w-full"
                onClick={() => {
                  modalOpen("Settings");
                  setModal(false);
                }}
              >
                <PiGear className="text-xl" />
                <span className="">Settings</span>
              </li>
              <li
                className="flex justify-start items-center gap-2 p-3 rounded-lg border border-transparent hover:border-primaryColor/30 hover:bg-primaryColor/5 duration-300 cursor-pointer w-full"
                onClick={() => {
                  modalOpen("Support Modal");
                  setModal(false);
                }}
              >
                <PiQuestion className="text-xl" />
                <span className="">Help & FAQ</span>
              </li>
              <li
                className="w-full cursor-pointer"
                onClick={handleLogout}
              >
                <div className="flex justify-start items-center gap-2 p-3 rounded-lg border border-transparent hover:border-errorColor/30 hover:bg-errorColor/5 duration-300 w-full text-errorColor">
                  <PiSignOut className="text-xl" />
                  <span className="">Log Out</span>
                </div>
              </li>
            </>
          ) : (
            <>
              <li
                className="flex justify-start items-center gap-2 p-3 rounded-lg border border-transparent hover:border-primaryColor/30 hover:bg-primaryColor/5 duration-300 cursor-pointer w-full"
                onClick={handleSignIn}
              >
                <PiSignIn className="text-xl" />
                <span className="">Sign In</span>
              </li>
              <li
                className="flex justify-start items-center gap-2 p-3 rounded-lg border border-transparent hover:border-primaryColor/30 hover:bg-primaryColor/5 duration-300 cursor-pointer w-full"
                onClick={handleSignUp}
              >
                <PiUserPlus className="text-xl" />
                <span className="">Sign Up</span>
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}

export default UserModal;
