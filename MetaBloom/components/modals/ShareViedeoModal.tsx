import React from "react";
import {
  PiDownloadSimple,
  PiFacebookLogo,
  PiInstagramLogo,
  PiLinkSimple,
  PiPinterestLogo,
  PiPlayFill,
  PiUserPlus,
} from "react-icons/pi";
import videoPreviewImg from "@/public/images/video-preview-img-2.png";
import Image from "next/image";

function ShareViedeoModal() {
  return (
    <div className="flex justify-start items-start gap-6 max-md:flex-col">
      <div className=" rounded-xl overflow-hidden relative flex-1 self-stretch">
        <div className="bg-black/30 absolute inset-0 p-3 flex flex-col justify-between items-center">
          <div className="flex justify-end w-full"></div>
          <div className="bg-errorColor rounded-full p-3 text-white flex justify-center items-center">
            <PiPlayFill className="text-2xl" />
          </div>
          <div className="flex justify-end items-center gap-2 w-full ">
            <div className="p-2 rounded-md bg-white font-medium dark:bg-n0">
              <p className="text-sm">20:05</p>
            </div>
            <div className="p-2 rounded-md bg-white dark:bg-n0">
              <PiDownloadSimple className="text-xl" />
            </div>
          </div>
        </div>
        <Image
          src={videoPreviewImg}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-col gap-5 flex-1">
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
            <p className="text-sm font-medium group-hover:text-white">
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
  );
}

export default ShareViedeoModal;
