import Image from "next/image";
import React, { useEffect, useState } from "react";
import logo from "@/public/images/MetaBloom logo.png";
import {
  PiArrowCircleUpRight
} from "react-icons/pi";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/stores/auth";
import { ChatHistoryContainer } from "./chat-history";
import { useUserSubscription } from "@/hooks/useUserSubscription";

type MainSidebarProps = {
  showSidebar: boolean;
  setShowSidebar: React.Dispatch<React.SetStateAction<boolean>>;
};
function MainSidebar({ showSidebar, setShowSidebar }: MainSidebarProps) {
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { currentPlan } = useUserSubscription();

  useEffect(() => {
    if (window.innerWidth > 992) {
      setShowSidebar(true);
    }
  }, []);

  // Check authentication status on client side
  useEffect(() => {
    setIsUserAuthenticated(isAuthenticated);
    setIsAuthChecked(true);
  }, [isAuthenticated]);

  // If user is not authenticated, don't render the sidebar at all
  if (isAuthChecked && !isUserAuthenticated) {
    return null;
  }

  return (
    <div
      className={`
        w-[290px] bg-white dark:bg-n0 border-r border-primaryColor/20
        h-dvh overflow-hidden transition-transform duration-300
        ${showSidebar ? 'relative' : 'fixed top-0 left-0 z-40'}
        ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      <div
        className={` p-5 bg-primaryColor/5 h-full flex flex-col justify-between `}
      >
        <div className="flex-shrink-0">
          <div className="flex justify-center items-center">
            <Link href="/new-chat" className="flex justify-start items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
              <Image src={logo} alt="MetaBloom Logo" width={32} height={32} />
              <span className="text-2xl font-semibold text-n700 dark:text-n30">
                MetaBloom
              </span>
            </Link>
          </div>
          <div className="flex flex-col gap-1 justify-start items-start pt-5 lg:pt-12 pb-5">
            <Link
              href={"/new-chat"}
              className="flex justify-start py-3 px-6 items-center gap-3 hover:text-primaryColor hover:bg-primaryColor/10 rounded-xl duration-500"
            >
              <Image src={"/images/plus.png"} width={20} height={20} alt="New Chat" />
              <span className="text-sm font-medium" style={{ fontFamily: 'Roboto, sans-serif' }}>New Chat</span>
            </Link>
            {/* <Link
              href={"/ai-generator"}
              className="flex justify-center py-3 px-6 items-center gap-2 hover:text-primaryColor hover:bg-primaryColor/10 rounded-xl duration-500 "
            >
              <PiRobot size={20} className="text-primaryColor" />
              <span className="text-sm ">AI Generator</span>
            </Link> */}
            {/* <Link
              href={"/explore"}
              className="flex justify-center py-3 px-6 items-center gap-2 hover:text-primaryColor hover:bg-primaryColor/10 rounded-xl duration-500 "
            >
              <PiDiamondsFour size={20} className="text-primaryColor" />
              <span className="text-sm ">Explore MetaBloom</span>
            </Link> */}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {isUserAuthenticated && <ChatHistoryContainer className="flex-1" />}
        </div>
        {currentPlan === 'free' && (
          <div className="flex-shrink-0">
            <div className="flex justify-between items-center rounded-xl py-4 px-6 bg-primaryColor/5 border border-primaryColor/30">
              <button
                className="flex justify-center items-center gap-2 font-medium text-primaryColor w-full"
                onClick={() => router.push('/upgrade-plan')}
              >
          <PiArrowCircleUpRight size={20} className="text-blue-600" />
          <span className="text-sm font-medium whitespace-nowrap">Upgrade Plan</span>
              </button>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MainSidebar;
