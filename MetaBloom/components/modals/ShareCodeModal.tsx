import { phpCode } from "@/constants/data";
import React from "react";
import {
  PiCopy,
  PiDownloadSimple,
  PiFacebookLogo,
  PiInstagramLogo,
  PiLinkSimple,
  PiPinterestLogo,
  PiUserPlus,
} from "react-icons/pi";
import ShikiHighlighter from "react-shiki";

export default function ShareCodeModal() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-start items-start gap-6 max-md:flex-col">
        <div className=" rounded-md relative ">
          <div className="absolute top-0 left-0 right-0 bg-white flex justify-between items-center z-10 dark:bg-n0">
            <p className="text-sm font-medium">PHP Languages</p>
            <div className="flex justify-start items-center gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(phpCode)}
                className="flex justify-start items-center gap-1 text-n300"
              >
                <PiCopy className="text-sm" />
                <span className="text-xs font-medium">Copy</span>
              </button>
            </div>
          </div>

          <div className=" overflow-auto">
            <ShikiHighlighter language="jsx" theme="ayu-dark" className="pt-10">
              {phpCode}
            </ShikiHighlighter>
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
    </div>
  );
}
