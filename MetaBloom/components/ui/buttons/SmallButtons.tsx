import React from "react";

type SmallButtonProps = {
  name: string;
  fn?: () => void;
  secondary?: boolean;
};

function SmallButtons({ name, fn, secondary }: SmallButtonProps) {
  return (
    <button
      onClick={fn}
      className={`py-2 px-4 rounded-full  border  ${
        secondary
          ? "border-primaryColor text-primaryColor"
          : "bg-primaryColor text-white border-primaryColor"
      }`}
    >
      {name}
    </button>
  );
}

export default SmallButtons;
