import React from "react";
import AnimateHeight from "react-animate-height";
import { useMainModal } from "@/stores/modal";
import { PiCopy, PiShareNetwork } from "react-icons/pi";
import ShikiHighlighter from "react-shiki";
import { phpCode } from "@/constants/data";

function BotCodeReply({ show }: { show: boolean }) {
  const { modalOpen } = useMainModal();

  return (
    <AnimateHeight height={show ? "auto" : 0}>
      <div className="mt-5 bg-white p-2 rounded-md relative dark:bg-n0 ">
        <div className="absolute top-0 left-0 right-0 bg-white flex justify-between items-center py-3 px-5 z-10 dark:bg-n0">
          <p className="text-sm font-medium">PHP Languages</p>
          <div className="flex justify-start items-center gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(phpCode)}
              className="flex justify-start items-center gap-1 text-n300"
            >
              <PiCopy className="text-sm" />
              <span className="text-xs font-medium">Copy</span>
            </button>
            <button
              onClick={() => modalOpen("Share Code")}
              className="flex justify-start items-center gap-1 text-n300"
            >
              <PiShareNetwork className="text-sm" />
              <span className="text-xs font-medium">Share</span>
            </button>
          </div>
        </div>

        <div className=" overflow-auto">
          <ShikiHighlighter language="jsx" theme="ayu-dark" className="pt-10">
            {phpCode}
          </ShikiHighlighter>
        </div>
      </div>
    </AnimateHeight>
  );
}

export default BotCodeReply;
