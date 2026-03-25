import React from "react";
import {
  PiDownloadSimple,
  PiFacebookLogo,
  PiInstagramLogo,
  PiLinkSimple,
  PiPinterestLogo,
  PiUserPlus,
} from "react-icons/pi";
import Image from "next/image";
import img1 from "@/public/images/generate-photo-1.png";
import img2 from "@/public/images/generate-photo-2.png";
import img3 from "@/public/images/generate-photo-3.png";
import img4 from "@/public/images/generate-photo-4.png";

const images = [img1, img2, img3, img4];

function ShareImageModal() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-start items-start gap-6 max-md:flex-col">
        <div className="grid grid-cols-2 gap-2 flex-1 self-stretch">
          {images.map((item, idx) => (
            <div key={idx} className=" relative ">
              <Image
                src={item}
                alt=""
                className="rounded-xl h-full object-cover "
              />
            </div>
          ))}
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
      <div className=" border-y border-primaryColor/30 grid grid-cols-12">
        <div className=" max-sm:border-b sm:border-r border-primaryColor/30 pr-3 md:pr-6 py-2 sm:py-6 col-span-12 sm:col-span-6 lg:col-span-4">
          <p className="text-xs">Title</p>
          <p className="pt-2 text-sm font-medium text-n700 dark:text-n30">
            Create a 4 image for this prompt
          </p>
        </div>
        <div className=" border-r border-primaryColor/30 px-3 md:px-6 py-2 sm:py-6 col-span-4 sm:col-span-2">
          <p className="text-xs">Quantity</p>
          <p className="pt-2 text-sm font-medium text-n700 dark:text-n30">4</p>
        </div>
        <div className=" border-r border-primaryColor/30 px-3 md:px-6 py-2 sm:py-6 col-span-4 sm:col-span-2">
          <p className="text-xs">Size</p>
          <p className="pt-2 text-sm font-medium text-n700 dark:text-n30">
            320*320
          </p>
        </div>
        <div className=" px-3 md:px-6 py-2 sm:py-6 col-span-4 sm:col-span-2">
          <p className="text-xs">AI model</p>
          <p className="pt-2 text-sm font-medium text-n700 dark:text-n30">
            MetaBloom
          </p>
        </div>
      </div>
    </div>
  );
}

export default ShareImageModal;
