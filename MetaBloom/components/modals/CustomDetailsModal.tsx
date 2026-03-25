import React from "react";
import {
  PiChatCircleText,
  PiChecks,
  PiPencilLine,
  PiStarFill,
  PiTrash,
} from "react-icons/pi";
import icon from "@/public/images/explore-article-icon-12.png";
import icon2 from "@/public/images/explore-article-icon-14.png";
import Image from "next/image";
import Link from "next/link";
import { useMainModal } from "@/stores/modal";

const conversationStarters = [
  "Turn this script into a video for me",
  "Create a video about pairing snacks for movie nights",
  "Make a video to teach me about Newton&apos;s Laws of Motion",
  "Please transform this script into a video.",
];

function CustomDetailsModal() {
  const { modalClose, modalOpen } = useMainModal();
  return (
    <div className="">
      <div className="flex justify-center items-center text-center pt-6 flex-col ">
        <div className="">
          <Image src={icon} alt="" />
        </div>
        <p className="text-xl text-n700 font-semibold pt-5 dark:text-n30">
          Research Specialist
        </p>

        <p className="pt-3 max-sm:text-sm">
          Helps with academic research, paper analysis, and citation management,
          Help users find relevant papers, analyze research, and manage
          citations.
        </p>
        <p className="text-secondaryColor text-xs font-medium bg-secondaryColor/5 border border-secondaryColor/30 rounded-md mt-4 py-1 px-3">
          Research
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
        <div className="grid grid-cols-2 gap-3 pt-4">
          {conversationStarters.map((item, idx) => (
            <div
              key={idx}
              className="text-sm  p-3 rounded-t-xl rounded-br-xl border border-primaryColor/30 cursor-pointer flex justify-between items-center gap-2 group hover:bg-primaryColor/10 duration-300"
            >
              <p>{item}</p>

              <span className="text-primaryColor text-xl p-1 border border-primaryColor/30 rounded-md opacity-0 group-hover:opacity-100 duration-300 bg-white dark:bg-n0">
                <PiChatCircleText />
              </span>
            </div>
          ))}
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
          className="cursor-pointer flex justify-center items-center flex-1 gap-2 text-white py-2 md:py-3 px-4 md:px-6 bg-primaryColor rounded-full w-full"
          onClick={modalClose}
        >
          <PiChatCircleText className="text-xl" />
          <p className="text-sm font-medium">
            <span className="max-sm:hidden">Start</span> Chat
          </p>
        </Link>
        <div
          className="cursor-pointer flex justify-center items-center flex-1 gap-2 text-white py-2 md:py-3 px-4 md:px-6 bg-infoColor rounded-full w-full"
          onClick={() => modalOpen("Edit Your Bot")}
        >
          <PiPencilLine className="text-xl" />
          <p className="text-sm font-medium">
            Edit <span className="max-sm:hidden">Here</span>{" "}
          </p>
        </div>
        <div className="cursor-pointer flex justify-center items-center flex-1 gap-2 text-white py-2 md:py-3 px-4 md:px-6 bg-errorColor rounded-full w-full">
          <PiTrash className="text-xl" />
          <p className="text-sm font-medium">
            Delete <span className="max-sm:hidden">Here</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default CustomDetailsModal;
