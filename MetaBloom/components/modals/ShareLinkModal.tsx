import React from "react";
import { PiLinkSimple } from "react-icons/pi";

const shareLink = "https://www.demo.com/example/";

function ShareLinkModal() {
  return (
    <div className="">
      <p className="text-sm">
        Your name, custom instructions, and any messages you add after sharing
        stay private.{" "}
        <span className=" font-medium text-primaryColor">Learn more</span>
      </p>
      <div className={"w-full pt-3"}>
        <p className="text-xs text-n400 -mb-2.5 pl-6">
          <span className="bg-white dark:bg-n0">Response Style</span>
        </p>
        <div className="border border-primaryColor/20 rounded-xl py-2 pl-5 pr-2 flex justify-between items-center ">
          <p className="text-n100 text-sm ">{shareLink}...</p>
          <button
            onClick={() => navigator.clipboard.writeText(shareLink)}
            className="flex justify-center items-center gap-2 text-white px-4 py-2 rounded-lg bg-primaryColor border border-primaryColor"
          >
            <PiLinkSimple className="text-xl" />
            <span className="text-sm font-semibold">Create Link</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShareLinkModal;
