import React from "react";
import { PiList, PiUploadSimple, PiSignIn, PiUserPlus } from "react-icons/pi";
import UserModal from "./header/UserModal";
import { useMainModal } from "@/stores/modal";
import TokenCounter from "./header/TokenCounter";
import { usePathname } from "next/navigation";
import { useAuth } from "@/stores/auth";
import Image from "next/image";
import logo from "@/public/images/MetaBloom logo.png";
import Link from "next/link";

type HeaderProps = {
  showSidebar: boolean;
  setShowSidebar: React.Dispatch<React.SetStateAction<boolean>>;
};

function Header({ showSidebar, setShowSidebar }: HeaderProps) {
  const { modalOpen } = useMainModal();
  const path = usePathname();
  const { isAuthenticated } = useAuth();

  const handleSignInClick = () => {
    modalOpen("Authentication", { mode: "signin" });
  };

  const handleSignUpClick = () => {
    modalOpen("Authentication", { mode: "signup" });
  };

  return (
    <div className="px-6 pt-3 pb-3 flex justify-between items-center w-full sticky top-0 left-0 right-0 bg-white z-30 dark:bg-n0 border-b-0">
      <div className="flex justify-start items-center gap-2">
        {isAuthenticated ? (
          // Show logo on affiliate and upgrade-plan pages, empty space elsewhere - logo will be in sidebar or next to toggle
          (path === '/affiliate' || path === '/upgrade-plan') ? (
            <Link href="/new-chat" className="flex justify-start items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
              <Image src={logo} alt="MetaBloom Logo" width={32} height={32} />
              <span className="text-2xl font-semibold text-n700 dark:text-n30">
                MetaBloom
              </span>
            </Link>
          ) : (
            <div className="flex items-center">
              {/* Logo handled by sidebar/toggle component */}
            </div>
          )
        ) : (
          <Link href="/new-chat" className="flex justify-start items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
            <Image src={logo} alt="MetaBloom Logo" width={32} height={32} />
            <span className="text-2xl font-semibold text-n700 dark:text-n30">
              MetaBloom
            </span>
          </Link>
        )}
      </div>
      <div className="flex justify-start items-center gap-2 sm:gap-4 ">
        {/* ThemeSwitch moved to Settings modal */}

        {!isAuthenticated ? (
          <>
            <button
              onClick={handleSignInClick}
              className="flex justify-center items-center gap-2 py-2 px-2 sm:px-4 rounded-full border border-primaryColor text-primaryColor"
            >
              <PiSignIn />
              <span className="text-xs font-medium max-[400px]:hidden">
                Sign In
              </span>
            </button>
            <button
              onClick={handleSignUpClick}
              className="flex justify-center items-center gap-2 py-2 px-2 sm:px-4 rounded-full bg-primaryColor text-white"
            >
              <PiUserPlus />
              <span className="text-xs font-medium max-[400px]:hidden">
                Sign Up
              </span>
            </button>
          </>
        ) : (
          <>
            {path === "/custom-bots" && (
              <button
                onClick={() => modalOpen("Create New Bot")}
                className="flex justify-center items-center gap-2 py-2 px-2 sm:px-4 rounded-full border border-primaryColor text-primaryColor"
              >
                <PiUploadSimple />
                <span className="text-xs font-medium max-[400px]:hidden">
                  Create New
                </span>
              </button>
            )}
          </>
        )}

        {isAuthenticated && <UserModal />}
      </div>
    </div>
  );
}

export default Header;
