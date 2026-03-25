import React from "react";
import {
  PiChatCircleText,
  PiChecks,
  PiGlobe,
  PiStarFill,
} from "react-icons/pi";
import icon from "@/public/images/explore-article-icon-12.png";
import icon2 from "@/public/images/explore-article-icon-14.png";
import Image from "next/image";
import Link from "next/link";
import { useMainModal } from "@/stores/modal";

function BotDetailsModal() {
  const { modalClose } = useMainModal();
  return (
    <div className="">
      <div className="flex justify-center items-center text-center pt-6 flex-col ">
        <div className="">
          <Image src={icon} alt="" />
        </div>
        <p className="text-xl text-n700 font-semibold pt-5 dark:text-n30">
          AI Video Maker by Descript
        </p>
        <div className="flex justify-center items-center gap-1 pt-3">
          <p className="text-xs text-n700 dark:text-n30">By demo.com</p>
          <div className="flex justify-center items-center bg-primaryColor/10 border border-primaryColor/30 rounded-md p-1 text-xl">
            <PiGlobe />
          </div>
        </div>
        <p className="pt-3 max-sm:text-sm">
          Helps with academic research, paper analysis, and citation management,
          Help users find relevant papers, analyze research, and manage
          citations.
        </p>

        <div className="flex justify-center items-center max-[430px]:flex-col py-7 gap-4 sm:gap-12 md:gap-16">
          <div className="flex justify-center items-center flex-col">
            <div className="flex justify-center items-center  text-lg font-medium gap-1">
              <PiStarFill className=" text-warningColor" />
              <p className="text-n700  dark:text-n30">4.7</p>
            </div>
            <p className="text-xs pt-2">Ratings (20K+)</p>
          </div>
          <div className="flex justify-center items-center flex-col">
            <div className="flex justify-center items-center  text-lg font-medium gap-1">
              <p className="text-n700  dark:text-n30">Productivity</p>
            </div>
            <p className="text-xs pt-2">Category</p>
          </div>
          <div className="flex justify-center items-center flex-col">
            <div className="flex justify-center items-center  text-lg font-medium gap-1">
              <p className="text-n700  dark:text-n30">600K+</p>
            </div>
            <p className="text-xs pt-2">Conversations</p>
          </div>
        </div>
      </div>

      <div className="border-y border-primaryColor/30 py-6">
        <p className="text-lg font-medium text-n700 dark:text-n30">
          Conversation Starters
        </p>
        <div className="grid grid-cols-12 gap-3 pt-4">
          <div className=" col-span-12 sm:col-span-6 flex flex-col gap-3">
            <p className="text-sm  p-3 rounded-t-xl rounded-br-xl border border-primaryColor/30">
              Turn this script into a video for me
            </p>

            <p className="text-sm  p-3 rounded-t-xl rounded-br-xl border border-primaryColor/30">
              Create a video about pairing snacks for movie nights
            </p>
          </div>
          <div className="col-span-12 sm:col-span-6 flex flex-col gap-3">
            <p className="text-sm  p-3 rounded-t-xl rounded-br-xl border border-primaryColor/30">
              Make a video to teach me about Newton&apos;s Laws of Motion
            </p>

            <p className="text-sm  p-3 rounded-t-xl rounded-br-xl border border-primaryColor/30">
              Please transform this script into a video.
            </p>
          </div>
        </div>
      </div>
      <div className="border-b border-primaryColor/30 py-6">
        <p className="text-lg font-medium text-n700 dark:text-n30">
          Capabilities
        </p>
        <div className="flex justify-start items-center gap-2 md:gap-7 pt-4">
          <div className="flex justify-start items-center gap-2">
            <PiChecks className="text-xl text-primaryColor" />
            <p className="text-sm">DALL·E Images</p>
          </div>
          <div className="flex justify-start items-center gap-2">
            <PiChecks className="text-xl text-primaryColor" />
            <p className="text-sm">Web Search</p>
          </div>
          <div className="flex justify-start items-center gap-2">
            <PiChecks className="text-xl text-primaryColor" />
            <p className="text-sm">Actions</p>
          </div>
        </div>
      </div>
      <div className="border-b border-primaryColor/30 py-6">
        <p className="text-lg font-medium text-n700 dark:text-n30">Ratings</p>
        <div className="flex flex-col gap-2 pt-4">
          <div className="flex justify-start items-center gap-3 sm:gap-5">
            <div className="flex justify-start items-center gap-1">
              <PiStarFill className="text-sm text-warningColor" />
              <p className="text-sm">5</p>
            </div>
            <div className="relative bg-primaryColor/30 rounded-sm h-3 w-full overflow-hidden">
              <div className="absolute bg-warningColor h-full w-[100%]"></div>
            </div>
            <p className="text-sm w-[50px]">100%</p>
          </div>
          <div className="flex justify-start items-center gap-3 sm:gap-5">
            <div className="flex justify-start items-center gap-1">
              <PiStarFill className="text-sm text-warningColor" />
              <p className="text-sm">4</p>
            </div>
            <div className="relative bg-primaryColor/30 rounded-sm h-3 w-full overflow-hidden">
              <div className="absolute bg-warningColor h-full w-[80%] rounded-sm"></div>
            </div>
            <p className="text-sm w-[50px]">80%</p>
          </div>
          <div className="flex justify-start items-center gap-3 sm:gap-5">
            <div className="flex justify-start items-center gap-1">
              <PiStarFill className="text-sm text-warningColor" />
              <p className="text-sm">3</p>
            </div>
            <div className="relative bg-primaryColor/30 rounded-sm h-3 w-full overflow-hidden">
              <div className="absolute bg-warningColor h-full w-[60%] rounded-sm"></div>
            </div>
            <p className="text-sm w-[50px]">60%</p>
          </div>
          <div className="flex justify-start items-center gap-3 sm:gap-5">
            <div className="flex justify-start items-center gap-1">
              <PiStarFill className="text-sm text-warningColor" />
              <p className="text-sm">2</p>
            </div>
            <div className="relative bg-primaryColor/30 rounded-sm h-3 w-full overflow-hidden">
              <div className="absolute bg-warningColor h-full w-[40%] rounded-sm"></div>
            </div>
            <p className="text-sm w-[50px]">40%</p>
          </div>
          <div className="flex justify-start items-center gap-3 sm:gap-5">
            <div className="flex justify-start items-center gap-1">
              <PiStarFill className="text-sm text-warningColor" />
              <p className="text-sm">1</p>
            </div>
            <div className="relative bg-primaryColor/30 rounded-sm h-3 w-full overflow-hidden">
              <div className="absolute bg-warningColor h-full w-[20%] rounded-sm"></div>
            </div>
            <p className="text-sm w-[50px]">20%</p>
          </div>
        </div>
      </div>
      <div className=" py-6">
        <p className="text-lg font-medium text-n700 dark:text-n30">
          More Related
        </p>
        <div className="flex flex-col gap-4 pt-4">
          <div className="bg-primaryColor/5 border border-primaryColor/30 p-3 sm:p-5 rounded-lg flex justify-start items-start gap-3 sm:gap-5 cursor-pointer">
            <div className=" size-12 sm:size-20">
              <Image src={icon} alt="" className="" />
            </div>
            <div className=" flex-1 flex justify-start items-start flex-col">
              <p className="text-lg font-medium">
                Mermaid Chart: diagrams and charts
              </p>
              <p className="text-sm pt-3">
                Official AIQuill from the Mermaid team. Generate a Mermaid
                diagram or chart with text including video generator and video
                editor in one.
              </p>
              <p className="text-xs pt-4">By demo.com</p>
            </div>
          </div>
          <div className="bg-primaryColor/5 border border-primaryColor/30 p-3 sm:p-5 rounded-lg flex justify-start items-start gap-3 sm:gap-5 cursor-pointer">
            <div className=" size-12 sm:size-20">
              <Image src={icon2} alt="" className="" />
            </div>
            <div className=" flex-1 flex justify-start items-start flex-col">
              <p className="text-lg font-medium">Tutor Me</p>
              <p className="text-sm pt-3">
                Your personal AI tutor by Khan Academy! I&apos;m Khanmigo Lite -
                here to help you with math, science, and—a powerful
                text-to-speech video generator.
              </p>
              <p className="text-xs pt-4">By demo.com</p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center gap-2 max-[430px]:flex-col ">
        <Link
          href={"/new-chat"}
          onClick={modalClose}
          className="cursor-pointer flex justify-center items-center flex-1 gap-2 text-white py-2 md:py-3 px-4 md:px-6 bg-primaryColor rounded-full w-full"
        >
          <PiChatCircleText className="text-xl" />
          <p className="text-sm font-medium">
            <span className="max-sm:hidden">Start</span> Chat
          </p>
        </Link>
      </div>
    </div>
  );
}

export default BotDetailsModal;
