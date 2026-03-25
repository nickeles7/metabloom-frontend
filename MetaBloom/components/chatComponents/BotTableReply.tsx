import { useMainModal } from "@/stores/modal";
import React from "react";
import AnimateHeight from "react-animate-height";
import {
  PiCheckCircle,
  PiCheckCircleFill,
  PiDownloadSimple,
  PiPlayCircleFill,
  PiStarFill,
  PiStarHalfFill,
} from "react-icons/pi";

function BotTableReply({ show }: { show: boolean }) {
  const { modalOpen } = useMainModal();
  return (
    <AnimateHeight
      height={show ? "auto" : 0}
      className=" w-full  max-w-[950px]"
    >
      <div className=" mt-5 flex flex-col gap-5">
        <p className="text-2xl font-semibold text-n700">Very good!</p>
        <div className="flex justify-start items-center gap-2">
          <div className="flex justify-start items-center gap-1 text-warningColor text-xl">
            <PiStarFill />
            <PiStarFill />
            <PiStarFill />
            <PiStarFill />
            <PiStarHalfFill />
          </div>
          <p className="text-xs font-medium py-1 px-4 rounded-full border border-primaryColor/20 bg-white dark:bg-n0">
            4.85
          </p>
        </div>

        <div className="bg-white border border-primaryColor/20 rounded-xl dark:bg-n0 relative group ">
          <button
            onClick={() => modalOpen("Performance")}
            className=" opacity-0 group-hover:opacity-100 duration-300 absolute top-2 right-2 p-1 bg-primaryColor/10 border border-primaryColor/30 text-primaryColor rounded-md text-xl"
          >
            <PiDownloadSimple />
          </button>
          <div className="flex justify-start items-start p-4 sm:p-8 gap-3 sm:gap-6 max-sm:flex-col">
            <div className="flex-1 flex flex-col gap-2 sm:gap-5 justify-start items-start  ">
              <div className="p-2 bg-primaryColor/5 border border-primaryColor/20 flex justify-center items-center text-primaryColor text-2xl rounded-md">
                <PiCheckCircle />
              </div>
              <div className="">
                <p className="text-sm ">Reading Comprehension</p>
                <p className="text-2xl font-semibold pt-2">82%</p>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-2 sm:gap-5 justify-start items-start">
              <div className="p-2 bg-primaryColor/5 border border-primaryColor/20 flex justify-center items-center text-primaryColor text-2xl rounded-md">
                <PiCheckCircle />
              </div>
              <div className="">
                <p className="text-sm ">Writing Skills</p>
                <p className="text-2xl font-semibold pt-2">75%</p>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-2 sm:gap-5 justify-start items-start">
              <div className="p-2 bg-primaryColor/5 border border-primaryColor/20 flex justify-center items-center text-primaryColor text-2xl rounded-md">
                <PiCheckCircle />
              </div>
              <div className="">
                <p className="text-sm ">Grammar and Vocabulary</p>
                <p className="text-2xl font-semibold pt-2">98%</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col  ">
            <div className="grid grid-cols-12 py-3 px-4 md:px-10 border-t border-primaryColor/20 max-[480px]:text-xs text-sm font-medium bg-errorColor/5 gap-1">
              <p className=" col-span-1 md:col-span-3">#</p>
              <p className=" col-span-5 md:col-span-4">Incorrect answer</p>
              <p className="col-span-5 md:col-span-4">Correct answer</p>
              <p className="col-span-1">How</p>
            </div>
            <div className="grid grid-cols-12 py-2 px-4 md:px-10 gap-1 max-[480px]:text-xs border-t border-primaryColor/20">
              <p className="col-span-1 md:col-span-3">44</p>
              <p className="text-errorColor col-span-5 md:col-span-4">
                which one
              </p>
              <p className="flex justify-start items-center text-successColor  col-span-5 md:col-span-4 gap-1">
                <span className=" rounded-full ">
                  <PiCheckCircleFill className="text-xl" />
                </span>
                to whom
              </p>
              <p className="text-2xl col-span-1 text-n100">
                <PiPlayCircleFill />
              </p>
            </div>
            <div className="grid grid-cols-12 py-2 px-4 md:px-10 gap-1 max-[480px]:text-xs border-t border-primaryColor/20">
              <p className="col-span-1 md:col-span-3">44</p>
              <p className="text-errorColor col-span-5 md:col-span-4">
                feeling irritated
              </p>
              <p className="flex justify-start items-center text-successColor  col-span-5 md:col-span-4 gap-1">
                <span className=" rounded-full ">
                  <PiCheckCircleFill className="text-xl" />
                </span>
                expressing consent
              </p>
              <p className="text-2xl col-span-1 text-n100">
                <PiPlayCircleFill />
              </p>
            </div>
            <div className="grid grid-cols-12 py-2 px-4 md:px-10 gap-1 max-[480px]:text-xs border-t border-primaryColor/20">
              <p className="col-span-1 md:col-span-3">44</p>
              <p className="text-errorColor col-span-5 md:col-span-4">open</p>
              <p className="flex justify-start items-center text-successColor  col-span-5 md:col-span-4 gap-1">
                <span className=" rounded-full ">
                  <PiCheckCircleFill className="text-xl" />
                </span>
                unspecified
              </p>
              <p className="text-2xl col-span-1 text-n100">
                <PiPlayCircleFill />
              </p>
            </div>
            <div className="grid grid-cols-12 py-2 px-4 md:px-10 gap-1 max-[480px]:text-xs border-t border-primaryColor/20">
              <p className="col-span-1 md:col-span-3">44</p>
              <p className="text-errorColor col-span-5 md:col-span-4">
                Gotham City
              </p>
              <p className="flex justify-start items-center text-successColor  col-span-5 md:col-span-4 gap-1">
                <span className=" rounded-full ">
                  <PiCheckCircleFill className="text-xl" />
                </span>
                Sydney
              </p>
              <p className="text-2xl col-span-1 text-n100">
                <PiPlayCircleFill />
              </p>
            </div>
            <div className="grid grid-cols-12 py-2 px-4 md:px-10 gap-1 max-[480px]:text-xs border-t border-primaryColor/20">
              <p className="col-span-1 md:col-span-3">44</p>
              <p className="text-errorColor col-span-5 md:col-span-4">
                negligent
              </p>
              <p className="flex justify-start items-center text-successColor  col-span-5 md:col-span-4 gap-1">
                <span className=" rounded-full ">
                  <PiCheckCircleFill className="text-xl" />
                </span>
                dependable
              </p>
              <p className="text-2xl col-span-1 text-n100">
                <PiPlayCircleFill />
              </p>
            </div>
          </div>
        </div>
      </div>
    </AnimateHeight>
  );
}

export default BotTableReply;
