"use client";
import React, { useState } from "react";

function ToggleButton({ fn }: { fn?: () => void }) {
  const [active, setActive] = useState(false);
  return (
    <button
      onClick={() => {
        setActive((prev) => !prev);
        fn?.();
      }}
      className={` border  rounded-full w-[62px] h-[34px] relative ${
        active
          ? " bg-primaryColor border-primaryColor"
          : "bg-primaryColor/5 border-primaryColor/30"
      } duration-500`}
    >
      <span
        className={`size-7 rounded-full bg-white  absolute  top-0.5 left-0.5 ${
          active ? "translate-x-[29px]" : " translate-x-0 "
        }  duration-500`}
      ></span>
    </button>
  );
}

export default ToggleButton;
