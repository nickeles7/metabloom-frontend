import React from "react";

function GradientBackground() {
  return (
    <div className="opacity-20">
      {/* Modern, cohesive gradient background with sophisticated colors */}
      <div className="bg-primaryColor opacity-40 blur-[250px] size-[300px] fixed -top-56 -left-56"></div>
      <div className="bg-secondaryColor opacity-30 blur-[200px] size-[250px] fixed -bottom-56 left-[50%]"></div>
      <div className="bg-primaryColor opacity-25 blur-[300px] size-[200px] fixed -top-[300px] left-[30%]"></div>
      <div className="bg-infoColor opacity-20 blur-[250px] size-[180px] fixed top-[200px] left-[70%]"></div>
      <div className="bg-secondaryColor opacity-15 blur-[200px] size-[220px] fixed top-[400px] -left-[100px]"></div>
      <div className="bg-primaryColor opacity-10 blur-[300px] size-[250px] fixed -bottom-[150px] -left-[150px]"></div>
    </div>
  );
}

export default GradientBackground;
