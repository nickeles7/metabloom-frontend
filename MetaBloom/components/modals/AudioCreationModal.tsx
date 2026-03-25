import React, { useState } from "react";
import {
  PiDownloadSimple,
  PiFacebookLogo,
  PiInstagramLogo,
  PiLinkSimple,
  PiPauseFill,
  PiPinterestLogo,
  PiPlayFill,
  PiPlus,
  PiUserPlus,
} from "react-icons/pi";
import WavesurferPlayer from "@wavesurfer/react";
import type WaveSurfer from "wavesurfer.js";
import { useTheme } from "next-themes";

const tabNames = ["Basic", "Standard", "Premium"];

function AudioCreationModal() {
  const [activeTab, setActiveTab] = useState(0);
  const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const { resolvedTheme } = useTheme();

  const onReady = (ws: WaveSurfer) => {
    setWavesurfer(ws);
    setIsPlaying(false);
  };

  const onPlayPause = () => {
    if (wavesurfer) {
      wavesurfer.playPause();
    }
  };
  return (
    <div className="flex flex-col gap-6">
      <div className="">
        <div className=" rounded-xl overflow-hidden relative cursor-pointer border border-primaryColor/30 w-full">
          <div className="flex justify-between items-center bg-white w-full dark:bg-n0 ">
            <ul className="flex justify-start items-center border-b border-primaryColor/30">
              {tabNames.map((item, idx) => (
                <li
                  key={idx}
                  onClick={() => setActiveTab(idx)}
                  className={` max-[350px]:px-2  px-3 sm:px-6 py-2 sm:py-3 border-r text-xs sm:text-sm ${
                    activeTab === idx
                      ? "text-white bg-primaryColor border-primaryColor"
                      : "border-primaryColor/30"
                  }`}
                >
                  {item}
                </li>
              ))}
            </ul>
            <button className="flex justify-end items-center gap-2 py-2 sm:py-3 px-2 sm:px-6 border-l border-r-primaryColor/30 text-primaryColor border-b border-primaryColor/30">
              <PiDownloadSimple />
              <span className="text-sm max-sm:hidden">Quick Export</span>
            </button>
          </div>
          <div className="py-3 sm:py-5 px-3 sm:px-6 flex justify-start items-center gap-2 sm:gap-3 bg-warningColor/5">
            <button
              onClick={onPlayPause}
              className="bg-primaryColor text-white p-2 sm:p-3 rounded-full text-xl sm:text-2xl"
            >
              {isPlaying ? <PiPauseFill /> : <PiPlayFill />}
            </button>
            <div className="flex-1 w-full ">
              <WavesurferPlayer
                height={60}
                waveColor={resolvedTheme === "dark" ? "#EBECED" : "#262D3B"}
                progressColor={"rgb(77, 107, 254)"}
                url="/audio/gardens-stylish-chill-303261.mp3"
                onReady={onReady}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                barWidth={2}
                barGap={1}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className=" max-sm:col-span-2 bg-primaryColor/5 border border-primaryColor/30 rounded-xl p-4 flex flex-col gap-4 flex-1">
          <div className="flex justify-start items-start flex-col gap-2 pb-5 border-b border-primaryColor/30">
            <p className="text-xs font-medium">Export</p>
            <div className="flex justify-start items-center gap-2 text-primaryColor bg-primaryColor/5 border border-primaryColor/30 px-6 py-3 rounded-xl">
              <PiDownloadSimple className="text-xl" />
              <p className="text-sm font-medium">Download</p>
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
        <div className="max-sm:col-span-2 bg-primaryColor/5 border border-primaryColor/30 rounded-xl p-4 flex flex-col gap-4 flex-1">
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
            <p className="text-xs font-medium">Other Share</p>
            <div className="flex justify-start items-center gap-2 group  hover:bg-primaryColor px-6 py-3 rounded-xl duration-300 w-full">
              <PiPlus className="text-xl text-primaryColor group-hover:text-white" />
              <p className="text-sm font-medium group-hover:text-white">
                Add Other
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AudioCreationModal;
