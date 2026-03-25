import React, { useState } from "react";
import AnimateHeight from "react-animate-height";
import { PiDownloadSimple, PiPauseFill, PiPlayFill } from "react-icons/pi";
import WavesurferPlayer from "@wavesurfer/react";
import type WaveSurfer from "wavesurfer.js";
import { useMainModal } from "@/stores/modal";
import { useTheme } from "next-themes";

const tabNames = ["Basic", "Standard", "Premium"];

function BotAudioClipReply({ show }: { show: boolean }) {
  const [activeTab, setActiveTab] = useState(0);
  const { modalOpen } = useMainModal();
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
    <AnimateHeight height={show ? "auto" : 0} className="w-full">
      <div className="flex justify-start mt-5 w-full">
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
            <button
              onClick={() => modalOpen("Audio Creation")}
              className="flex justify-end items-center gap-2 py-2 sm:py-3 px-2 md:px-6 border-l border-r-primaryColor/30 text-primaryColor border-b border-primaryColor/30"
            >
              <PiDownloadSimple />
              <span className="text-sm max-md:hidden">Quick Export</span>
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
    </AnimateHeight>
  );
}

export default BotAudioClipReply;
