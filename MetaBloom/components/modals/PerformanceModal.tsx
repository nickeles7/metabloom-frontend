import React from "react";
import {
  PiCheckCircle,
  PiCheckCircleFill,
  PiDownloadSimple,
  PiFacebookLogo,
  PiInstagramLogo,
  PiLinkSimple,
  PiPinterestLogo,
  PiPlayCircleFill,
  PiUserPlus,
} from "react-icons/pi";

function PerformanceModal() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-start items-start gap-6 max-md:flex-col">
        <div className="bg-primaryColor/5 border border-primaryColor/20 rounded-xl dark:bg-n0 w-full ">
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
        <div className="flex flex-col gap-3 md:gap-5 flex-1 ">
          <div className="flex justify-start items-start flex-col gap-2 pb-5 border-b border-primaryColor/30">
            <p className="text-xs font-medium">Export</p>
            <div className="flex justify-start items-center gap-2 text-primaryColor bg-primaryColor/5 border border-primaryColor/30 px-6 py-3 rounded-xl">
              <PiDownloadSimple className="text-xl" />
              <p className="text-sm font-medium">Download</p>
            </div>
          </div>
          <div className="flex justify-start items-start flex-col gap-2 pb-5 border-b border-primaryColor/30">
            <p className="text-xs font-medium">Share</p>
            <div className="flex justify-start items-center gap-2 group  hover:bg-primaryColor px-6 py-3 rounded-xl duration-300 w-full">
              <PiLinkSimple className="text-xl text-primaryColor group-hover:text-white" />
              <p className="text-sm font-medium group-hover:text-white">
                Get a Link
              </p>
            </div>
            <div className="flex justify-start items-center gap-2 group  hover:bg-primaryColor px-6 py-3 rounded-xl duration-300 w-full">
              <PiUserPlus className="text-xl text-primaryColor group-hover:text-white" />
              <p className="text-sm font-medium group-hover:text-white text-nowrap">
                Invite User
              </p>
            </div>
          </div>
          <div className="flex justify-start items-start flex-col gap-2 ">
            <p className="text-xs font-medium">More Share</p>
            <div className="flex justify-start items-center gap-2 group  hover:bg-primaryColor px-6 py-3 rounded-xl duration-300 w-full">
              <PiFacebookLogo className="text-xl text-primaryColor group-hover:text-white" />
              <p className="text-sm font-medium group-hover:text-white">
                Facebook
              </p>
            </div>
            <div className="flex justify-start items-center gap-2 group  hover:bg-primaryColor px-6 py-3 rounded-xl duration-300 w-full">
              <PiInstagramLogo className="text-xl text-primaryColor group-hover:text-white" />
              <p className="text-sm font-medium group-hover:text-white">
                Instagram
              </p>
            </div>
            <div className="flex justify-start items-center gap-2 group  hover:bg-primaryColor px-6 py-3 rounded-xl duration-300 w-full">
              <PiPinterestLogo className="text-xl text-primaryColor group-hover:text-white" />
              <p className="text-sm font-medium group-hover:text-white">
                Pinterest
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PerformanceModal;
